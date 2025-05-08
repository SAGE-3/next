import sqlite3
import pandas as pd
import numpy as np

class CSVDB:
    def __init__(self, file_path):
        self.conn = self.__create__(file_path)
        self.df = None
        self.headers = []

    def __create__(self, file_path):
        # Open the CSV file
        df = pd.read_csv(file_path, low_memory=False)
        db_path = ':memory:'
        conn = sqlite3.connect(db_path)
        df.to_sql('csv', conn, if_exists='replace', index=False)
        return conn

    # def fetch_as_json(self, query):
    #     cursor = self.conn.cursor()
    #     cursor.execute(query)
    #     rows = cursor.fetchall()
    #     for row in rows:
    #         print(row)

    #     columns = [column[0] for column in cursor.description]
    #     return [dict(zip(columns, row)) for row in rows]

    def fetch(self, query):
        cursor = self.conn.cursor()
        cursor.execute(query)
        rows = cursor.fetchall()
        self.headers = columns = [column[0] for column in cursor.description]
        self.df = pd.DataFrame(rows, columns=columns)
        # self.last_result_df.reset_index(drop=True, inplace=True)
        print(self.df)
        return self.df

    def to_csv(csv_sav_path, path):
        self.df.to_csv(csv_sav_path, index=False)
    

# Example:
# csv_db = CSVDB('../datasets/CarPrice.csv')
# csv_db.fetch("SELECT * FROM csv")
# csv_db.fetch(" SELECT CarName, AVG(citympg + highwaympg) AS avg_fuel_efficiency FROM csv GROUP BY CarName ORDER BY avg_fuel_efficiency DESC; ").to_csv('../datasets/CarPrice_TEMP.csv')
# print(csv_db.headers)