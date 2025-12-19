from sqlalchemy import create_engine, MetaData, Table, Column, String, Integer

# Database connection
DATABASE_URL = "postgresql://postgres:Srusti%40123@localhost:5432/Quotation"
engine = create_engine(DATABASE_URL)
metadata = MetaData()

# Define the global_quotation_template table
global_quotation_template_table = Table(
    "global_quotation_template",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", String, default="default"),
    Column("template_data", String),
    Column("created_at", String),
    Column("updated_at", String)
)

# Create the table
try:
    metadata.create_all(engine)
    print("✓ Table 'global_quotation_template' created successfully!")
except Exception as e:
    print(f"✗ Error creating table: {e}")
