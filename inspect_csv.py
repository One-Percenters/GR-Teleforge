import pandas as pd

df = pd.read_csv('data/raw/road-america/Race 1/23_AnalysisEnduranceWithSections_Race 1_Anonymized.CSV', encoding='latin1', sep=';')
cols = df.columns
print("Columns:", list(cols))
num_col = next((c for c in cols if 'NUM' in c.upper() or 'NO' in c.upper()), None)
print("Selected num_col:", num_col)
