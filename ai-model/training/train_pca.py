"""
PCA model training and driver clustering.
Trains PCA on extracted features and generates driver archetypes.
"""
import pandas as pd
import numpy as np
import pickle
from pathlib import Path
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from typing import Dict, Tuple

def train_pca_model(feature_matrix: pd.DataFrame, n_components: int = 3) -> Tuple[PCA, StandardScaler, pd.DataFrame]:
    """
    Train PCA model on driver features.
    
    Args:
        feature_matrix: DataFrame with driver features
        n_components: Number of PCA components to keep
        
    Returns:
        Tuple of (pca_model, scaler, transformed_data)
    """
    # Remove non-numeric columns
    feature_cols = feature_matrix.select_dtypes(include=[np.number]).columns.tolist()
    if 'NUMBER' in feature_cols:
        feature_cols.remove('NUMBER')
    
    X = feature_matrix[feature_cols].fillna(0)  # Fill NaN with 0
    driver_ids = feature_matrix['NUMBER'].values
    
    print(f"\n🔬 Training PCA model...")
    print(f"   Features used: {len(feature_cols)}")
    print(f"   Drivers: {len(X)}")
    
    # Standardize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train PCA
    pca = PCA(n_components=n_components)
    X_pca = pca.fit_transform(X_scaled)
    
    # Print explained variance
    print(f"\n📊 PCA Results:")
    for i, var in enumerate(pca.explained_variance_ratio_, 1):
        print(f"   PC{i} explains: {var*100:.1f}% of variance")
    print(f"   Total: {pca.explained_variance_ratio_.sum()*100:.1f}%")
    
    # Create DataFrame with PCA results
    pca_df = pd.DataFrame(
        X_pca,
        columns=[f'PC{i+1}' for i in range(n_components)]
    )
    pca_df['NUMBER'] = driver_ids
    
    # Print component loadings
    print(f"\n🔍 Component Loadings (Top 3 features per PC):")
    loadings = pd.DataFrame(
        pca.components_.T,
        columns=[f'PC{i+1}' for i in range(n_components)],
        index=feature_cols
    )
    
    for i in range(n_components):
        pc = f'PC{i+1}'
        top_features = loadings[pc].abs().nlargest(3)
        print(f"\n   {pc}:")
        for feat, val in top_features.items():
            print(f"      {feat}: {loadings.loc[feat, pc]:.3f}")
    
    return pca, scaler, pca_df, feature_cols

def cluster_drivers(pca_df: pd.DataFrame, n_clusters: int = 4) -> pd.DataFrame:
    """
    Cluster drivers in PCA space.
    
    Args:
        pca_df: DataFrame with PCA coordinates
        n_clusters: Number of clusters
        
    Returns:
        DataFrame with cluster assignments
    """
    print(f"\n🎯 Clustering drivers into {n_clusters} groups...")
    
    # Use first 2 PCs for clustering
    X_cluster = pca_df[['PC1', 'PC2']].values
    
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    pca_df['cluster'] = kmeans.fit_predict(X_cluster)
    
    # Print cluster distribution
    print(f"   Cluster distribution:")
    for i in range(n_clusters):
        count = (pca_df['cluster'] == i).sum()
        print(f"      Cluster {i}: {count} drivers")
    
    return pca_df, kmeans

def assign_skill_tags(pc1: float, pc2: float, pc3: float) -> list:
    """
    Assign skill tags based on PCA coordinates.
    
    Args:
        pc1: First principal component (Overall Pace)
        pc2: Second principal component (Style)
        pc3: Third principal component (Aggression)
        
    Returns:
        List of skill tags
    """
    tags = []
    
    # PC1: Overall Pace
    if pc1 > 1.0:
        tags.append("Elite Pace")
    elif pc1 > 0.3:
        tags.append("Strong Pace")
    elif pc1 < -1.0:
        tags.append("Development Driver")
    
    # PC2: Driving Style (S1 vs S2 tradeoff)
    if pc2 > 0.5:
        tags.append("Straight-Line Specialist")
    elif pc2 < -0.5:
        tags.append("Corner Speed Master")
    else:
        tags.append("Balanced Approach")
    
    # PC3: Aggression
    if pc3 > 0.5:
        tags.append("Aggressive Braker")
    elif pc3 < -0.5:
        tags.append("Smooth Operator")
    
    # Consistency (based on position near origin in PC1-PC2 space)
    if abs(pc1) < 0.3 and abs(pc2) < 0.3:
        tags.append("Metronome")
    
    return tags

def generate_driver_profiles(pca_df: pd.DataFrame, output_path: Path) -> Dict:
    """
    Generate driver_profiles.json from PCA results.
    
    Args:
        pca_df: DataFrame with PCA coordinates and clusters
        output_path: Path to save JSON file
        
    Returns:
        Dictionary of driver profiles
    """
    print(f"\n📝 Generating driver profiles...")
    
    profiles = {}
    cluster_names = {
        0: "Consistent Performers",
        1: "Technical Specialists", 
        2: "Power Drivers",
        3: "Developing Talent"
    }
    
    for _, row in pca_df.iterrows():
        driver_id = f"GR86-{int(row['NUMBER']):03d}"
        
        # Assign skill tags
        tags = assign_skill_tags(row['PC1'], row['PC2'], row.get('PC3', 0))
        
        # Calculate percentiles
        pc1_percentile = int((pca_df['PC1'] < row['PC1']).mean() * 100)
        
        profiles[driver_id] = {
            "vehicle_id": driver_id,
            "vehicle_number": int(row['NUMBER']),
            "pca_analysis": {
                "pc1_pace": round(float(row['PC1']), 2),
                "pc2_style": round(float(row['PC2']), 2),
                "pc3_aggression": round(float(row.get('PC3', 0)), 2),
                "percentile_pace": pc1_percentile
            },
            "skill_tags": tags,
            "cluster_id": int(row['cluster']),
            "cluster_name": cluster_names.get(int(row['cluster']), "Unknown")
        }
    
    # Save JSON
    import json
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(profiles, f, indent=2)
    
    print(f"   ✅ Saved {len(profiles)} driver profiles to: {output_path}")
    
    return profiles

def save_model_artifacts(pca, scaler, kmeans, feature_cols, output_dir: Path):
    """
    Save trained model artifacts for reuse.
    
    Args:
        pca: Trained PCA model
        scaler: Fitted StandardScaler
        kmeans: Trained KMeans model
        feature_cols: List of feature column names
        output_dir: Directory to save models
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    
    artifacts = {
        'pca': pca,
        'scaler': scaler,
        'kmeans': kmeans,
        'feature_cols': feature_cols,
        'component_names': ['Overall Pace', 'S1 vs S2 Tradeoff', 'Aggression']
    }
    
    model_path = output_dir / 'pca_model.pkl'
    with open(model_path, 'wb') as f:
        pickle.dump(artifacts, f)
    
    print(f"\n💾 Model artifacts saved to: {model_path}")

def train_full_pipeline(data_root: Path, output_dir: Path):
    """
    Run complete training pipeline.
    
    Args:
        data_root: Root directory with race CSV files
        output_dir: Directory for outputs
    """
    from features.extract_features import build_feature_matrix
    
    print("="*60)
    print("🏎️  PCA Driver DNA Training Pipeline")
    print("="*60)
    
    # Step 1: Extract features
    feature_path = output_dir / 'driver_features_matrix.csv'
    feature_matrix = build_feature_matrix(data_root, feature_path)
    
    # Step 2: Train PCA
    pca, scaler, pca_df, feature_cols = train_pca_model(feature_matrix)
    
    # Step 3: Cluster drivers
    pca_df, kmeans = cluster_drivers(pca_df)
    
    # Step 4: Generate profiles
    profiles_path = output_dir / 'driver_profiles.json'
    profiles = generate_driver_profiles(pca_df, profiles_path)
    
    # Step 5: Save model
    models_dir = output_dir.parent / 'models'
    save_model_artifacts(pca, scaler, kmeans, feature_cols, models_dir)
    
    print("\n" + "="*60)
    print("✅ Training Complete!")
    print("="*60)
    print(f"\nOutputs:")
    print(f"  📊 Features: {feature_path}")
    print(f"  👥 Profiles: {profiles_path}")
    print(f"  🤖 Model: {models_dir / 'pca_model.pkl'}")
