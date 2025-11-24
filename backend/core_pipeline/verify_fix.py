import pandas as pd
import sys

def verify_logic():
    print("Verifying chunk processing logic...")
    # Create a dummy chunk with NaT in index and no name
    data = {'Speed': [100, 105, 110]}
    index = [pd.Timestamp('2023-01-01 10:00:00'), pd.NaT, pd.Timestamp('2023-01-01 10:00:02')]
    chunk = pd.DataFrame(data, index=index)
    chunk.index.name = None  # Simulate missing name
    
    print("Original Chunk:")
    print(chunk)
    
    try:
        # --- The Fixed Logic ---
        chunk.index.rename('Time', inplace=True)
        
        if pd.api.types.is_numeric_dtype(chunk.index):
            chunk.index = pd.to_datetime(chunk.index, unit='s', errors='coerce')
        
        chunk.index = pd.to_datetime(chunk.index, errors='coerce')
        
        # The Fix: Filter directly
        chunk = chunk[chunk.index.notna()]
        chunk.index.name = 'Time'
        
        print("\nProcessed Chunk:")
        print(chunk)
        
        if len(chunk) == 2 and chunk.index.name == 'Time':
            print("\nSUCCESS: Logic handled NaT and missing index name correctly.")
        else:
            print("\nFAILURE: Logic did not produce expected result.")
            sys.exit(1)
            
    except Exception as e:
        print(f"\nCRASHED: {e}")
        sys.exit(1)

def verify_error_printing():
    print("\nVerifying error printing...")
    file_name = "test_file.csv"
    e = Exception("Test error with unicode \u274c")
    
    try:
        error_msg = f"--- FAILED processing {file_name}. Error: {e}"
        try:
            print(error_msg)
        except UnicodeEncodeError:
            print(error_msg.encode('utf-8', errors='replace').decode('utf-8'))
        print("SUCCESS: Error printing handled without crash.")
    except Exception as e:
        print(f"FAILURE: Error printing crashed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    verify_logic()
    verify_error_printing()
