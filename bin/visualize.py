#!/usr/bin/env python3

import json
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Read the JSON data
with open('results.json', 'r') as f:
    data = json.load(f)

# Convert to DataFrame
records = []
for benchmark in data['benchmarks']:
    record = {
        'name': benchmark['name'],
        'group': benchmark['group'],
        'avg': benchmark['stats']['avg'],
        'min': benchmark['stats']['min'],
        'max': benchmark['stats']['max'],
        'p50': benchmark['stats']['p50'],
        'p75': benchmark['stats']['p75'],
        'p99': benchmark['stats']['p99']
    }
    records.append(record)

df = pd.DataFrame(records)

# Set style
sns.set_theme(style="whitegrid")

# 1. Bar chart comparing average execution times for basic queries
def create_basic_queries_comparison():
    basic_queries = df[df['group'].str.contains('movies.findMany\(\) \(all')].copy()
    basic_queries['avg_ms'] = basic_queries['avg'] / 1_000_000

    plt.figure(figsize=(12, 6))
    bar_plot = sns.barplot(data=basic_queries, x='name', y='avg_ms')
    plt.xticks(rotation=45, ha='right')
    plt.title('Average Execution Time for Basic Queries')
    plt.ylabel('Time (ms)')
    plt.tight_layout()
    plt.savefig('basic_queries_comparison.png')
    plt.close()

# 2. Box plot for operations with multiple samples
def create_boxplot_comparison():
    operations = df[df['group'].str.contains('update|findUnique')].copy()
    operations['avg_ms'] = operations['avg'] / 1_000_000
    operations['p50_ms'] = operations['p50'] / 1_000_000
    operations['p75_ms'] = operations['p75'] / 1_000_000
    operations['p99_ms'] = operations['p99'] / 1_000_000

    plt.figure(figsize=(15, 8))
    box_plot = sns.boxplot(data=operations, x='group', y='avg_ms', hue='name')
    plt.xticks(rotation=45, ha='right')
    plt.title('Distribution of Execution Times by Operation')
    plt.ylabel('Time (ms)')
    plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
    plt.tight_layout()
    plt.savefig('operation_distribution.png')
    plt.close()

# 3. Performance comparison for different query types
def create_query_types_comparison():
    # Get query types data
    query_types = df[df['group'].str.contains('take: 2000|where')].copy()
    query_types['avg_ms'] = query_types['avg'] / 1_000_000

    # Get unique groups
    unique_groups = query_types['group'].unique()

    # Create a separate plot for each query type
    for group in unique_groups:
        group_data = query_types[query_types['group'] == group]

        # Create new figure for each group
        plt.figure(figsize=(10, 6))

        # Create bar plot
        ax = sns.barplot(data=group_data, x='name', y='avg_ms')

        # Customize plot
        ax.set_title(group, fontsize=12, pad=20)
        ax.set_xlabel('')
        ax.set_ylabel('Time (ms)')

        # Rotate x-axis labels
        plt.setp(ax.get_xticklabels(), rotation=45)

        # Add value labels on top of each bar
        for i, v in enumerate(group_data['avg_ms']):
            ax.text(i, v, f'{v:.1f}', ha='center', va='bottom')

        plt.tight_layout()

        # Create filename from group name (sanitized)
        filename = group.replace(' ', '_').replace('(', '').replace(')', '').replace('{', '').replace('}', '').replace(',', '').replace('...', '')
        plt.savefig(f'query_type_{filename}.png', bbox_inches='tight', dpi=300)
        plt.close()

# 4. Create relative performance comparison
def create_relative_performance():
    basic_queries = df[df['group'].str.contains('movies.findMany() (all')].copy()
    baseline = basic_queries[basic_queries['name'] == 'Native QE with tokio-postgres']['avg'].iloc[0]
    basic_queries['relative_performance'] = baseline / basic_queries['avg']

    plt.figure(figsize=(10, 6))
    bar_plot = sns.barplot(data=basic_queries, x='name', y='relative_performance')
    plt.xticks(rotation=45, ha='right')
    plt.title('Relative Performance (compared to Native)')
    plt.ylabel('Relative Speed (higher is better)')
    plt.axhline(y=1, color='r', linestyle='--')
    plt.tight_layout()
    plt.savefig('relative_performance.png')
    plt.close()

# Generate all visualizations
create_basic_queries_comparison()
create_boxplot_comparison()
create_query_types_comparison()
create_relative_performance()
