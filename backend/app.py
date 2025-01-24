from flask import Flask, request, jsonify
from groq import Groq
import pandas as pd
from flask_cors import CORS
from sqlalchemy import create_engine, inspect, text
import time
import logging
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class QueryProcessor:
    def __init__(self):
        logger.info("Initializing QueryProcessor")
        self.query_history = []
    logger.info("QueryProcessor class defined.")

    def process_query(self, query, sql, database):
        logger.info(f"Processing query: {query}")
        self.query_history.append({
            'query': query,
            'sql': sql,
            'database': database,
            'timestamp': datetime.now()
        })
        logger.info("Query processed and added to history.")

app = Flask(__name__)
CORS(app)

client = Groq(api_key='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')
processor = QueryProcessor()

def get_db_engine(database=None):
    base_url = 'mysql+pymysql://root:%23Prathamesh%405500@localhost'
    if database:
        return create_engine(f'{base_url}/{database}')
    return create_engine(base_url)

def get_table_info(database):
    engine = get_db_engine(database)
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    table_info = {}
    for table in tables:
        columns = inspector.get_columns(table)
        table_info[table] = [col['name'] for col in columns]
    return table_info

@app.route('/databases', methods=['GET'])
def get_databases():
    try:
        engine = get_db_engine()
        with engine.connect() as conn:
            result = conn.execute(text('SHOW DATABASES'))
            databases = [row[0] for row in result]
            logger.info(f"Available databases: {databases}")
        return jsonify({'databases': databases})
    except Exception as e:
        logger.error(f"Database fetch error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/columns', methods=['GET'])
def get_columns():
    database = request.args.get('database')
    if not database:
        return jsonify({'error': 'Database name required'}), 400
    
    try:
        table_info = get_table_info(database)
        return jsonify({'columns': table_info})
    except Exception as e:
        logger.error(f"Column fetch error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/query', methods=['POST'])
def handle_query():
    data = request.get_json()
    user_query = data.get('query', '')
    database = data.get('database', '')
    
    if not database:
        return jsonify({'error': 'Database selection required'}), 400
    
    try:
        table_info = get_table_info(database)
        table_details = []
        for table, columns in table_info.items():
            table_details.append(f"Table '{table}' with columns: {', '.join(columns)}")
        
        schema_info = ". ".join(table_details)
        
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{
                "role": "user", 
                "content": f"Convert to SQL query. Return only the SQL query without any markdown, explanation or comments. Database schema and: {schema_info}. Query: {user_query}"
            }],
            temperature=0.5,
            max_completion_tokens=512
        )
        
        sql_query = completion.choices[0].message.content.strip()

        sql_query = completion.choices[0].message.content.strip()
        sql_query = sql_query.replace('```sql', '').replace('```', '')
        sql_query = ' '.join(sql_query.split())
        sql_query = sql_query.rstrip(';')
        
        # Ensure the SQL query is not empty
        if not sql_query:
            return jsonify({'error': 'No SQL query generated.'}), 400
        


        
        logger.info(f"Generated SQL: {sql_query}")  # Log the generated SQL query
        
        engine = get_db_engine(database)
        df = pd.read_sql(sql_query, engine)
        results = df.to_dict(orient='records')
        
        processor.process_query(user_query, sql_query, database)
        
        return jsonify({
            'query': sql_query,
            'results': results,
            'table_info': table_info
        })
        
    except Exception as e:
        logger.error(f"Query execution error: {str(e)}")
        return jsonify({
            'error': str(e),
            'query': user_query,
            'database': database
        }), 500

if __name__ == '__main__':
    logger.info("Starting Flask server on port 5001")
    app.run(port=5001, debug=True)