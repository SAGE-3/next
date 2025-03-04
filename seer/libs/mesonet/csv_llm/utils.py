import pandas as pd
import numpy as np
import json
import math
from scipy.stats import normaltest

class Utils:
# Claude 3 Opus
    @staticmethod
    def calculate_metrics(file_path):
        def remove_nan_keys(obj):
            if isinstance(obj, dict):
                return {
                    key: remove_nan_keys(value)
                    for key, value in obj.items()
                    if not (isinstance(value, float) and math.isnan(value))
                }
            elif isinstance(obj, list):
                return [remove_nan_keys(item) for item in obj]
            else:
                return obj
        # Read the CSV file
        df = pd.read_csv(file_path)

        # Create an array to store the metrics for each column
        metrics_array = []

        # Iterate over each column in the DataFrame
        for column in df.columns:
            metrics = {}
            
            metrics['Column Name'] = column
            metrics['D Type'] = str(df[column].dtype)
            
            try:
                if pd.api.types.is_numeric_dtype(df[column]):
                    _, p_value = normaltest(df[column])
                    if p_value < 0.05:
                        metrics['Distribution Type'] = 'Non-normal'
                    else:
                        metrics['Distribution Type'] = 'Normal'
                else:
                    metrics['Distribution Type'] = 'Non-numeric'
            except:
                pass
            
            metrics['Count'] = int(df[column].count())
            metrics['Unique Values'] = int(df[column].nunique())
            metrics['Missing Values'] = int(df[column].isnull().sum())
            
            if pd.api.types.is_numeric_dtype(df[column]):
                metrics['Minimum'] = float(df[column].min())
                metrics['Maximum'] = float(df[column].max())
                metrics['Mean'] = float(df[column].mean())
                metrics['Median'] = float(df[column].median())
                try:
                    metrics['Mode'] = float(df[column].mode()[0])
                except:
                    pass
                metrics['Standard Deviation'] = float(df[column].std())
                metrics['Variance'] = float(df[column].var())
                metrics['Quartiles'] = [float(q) for q in df[column].quantile([0.25, 0.5, 0.75])]
                metrics['Interquartile Range (IQR)'] = float(df[column].quantile(0.75) - df[column].quantile(0.25))
                try:
                    metrics['Skewness'] = float(df[column].skew())
                except:
                    pass
                metrics['Kurtosis'] = float(df[column].kurt())
                metrics['Value Range'] = float(df[column].max() - df[column].min())
                metrics["Data Type"] = "Numerical" if metrics['Unique Values'] > 7 else "Categorical"

            if pd.api.types.is_string_dtype(df[column]):
                metrics["Data Type"] = "Categorical"
                
            metrics['Top 5 Values'] = {str(k): int(v) for k, v in df[column].value_counts().head(5).items()}

            # if pd.api.types.is_numeric_dtype(df[column]):
            #     metrics['Correlation'] = {str(k): float(v) for k, v in df.corr()[column].items()}
            
            metrics_array.append(metrics)

        return remove_nan_keys(metrics_array)

    @staticmethod
    def get_headers(file_path):
        df = pd.read_csv(file_path)
        return df.columns.values
