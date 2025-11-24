# Quick export script - run with: python backend/quick_export.py
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

print("Starting export...")
from backend.core_pipeline.data_export import export_all_frontend_data
export_all_frontend_data()
print("Export complete!")

