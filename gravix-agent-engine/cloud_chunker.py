import json
from google.cloud import bigquery

def push_to_bigquery(video_id, category, payload_dict):
    client = bigquery.Client()
    table_id = "antigravity_lake.omni_vault"

    rows_to_insert = [
        {
            "video_id": video_id,
            "category": category,
            "payload_json": json.dumps(payload_dict)
        }
    ]

    errors = client.insert_rows_json(table_id, rows_to_insert)
    if errors == []:
        print("New rows have been added.")
    else:
        print("Encountered errors while inserting rows: {}".format(errors))
