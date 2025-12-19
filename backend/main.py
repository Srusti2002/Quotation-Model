
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, MetaData, Table, Column, String, Integer, text
from sqlalchemy.exc import SQLAlchemyError
from typing import Any, Dict, List, Optional
import json
# --------------------------
# FastAPI App
# --------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------
# Database Setup
# --------------------------
DATABASE_URL = "postgresql://postgres:Srusti%40123@localhost:5432/Quotation"

engine = create_engine(DATABASE_URL)
metadata = MetaData()

metadata.create_all(engine)


    
    
    
    
# --------------------------
# Charges Table Setup
# --------------------------
charges_table = Table(
    "charges",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("name", String),
    Column("specification", String),
    Column("charge_amount", Integer)
)

metadata.create_all(engine)


# --------------------------
# Helper: Get Charges Columns
# --------------------------
def get_charge_columns():
    query = """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='charges'
    """
    with engine.connect() as conn:
        result = conn.execute(text(query))
        return [row[0] for row in result]
    
    # ---------------------- List Charges Columns -------------------------
@app.get("/charges/columns")
def list_charges_columns():
    return {"columns": get_charge_columns()}



# --------------------------
# Pydantic Models for Charges
# --------------------------
class AddChargeColumnRequest(BaseModel):
    column_name: str
    column_type: str = "string"

class DeleteChargeColumnRequest(BaseModel):
    column_name: str

class RenameChargeColumnRequest(BaseModel):
    old_name: str
    new_name: str


# --------------------------
# Add Column (Charges)
# --------------------------
@app.post("/charges/add-column")
def add_charge_column(req: AddChargeColumnRequest):
    col = req.column_name.strip().lower()

    if not col.isidentifier():
        raise HTTPException(status_code=400, detail="Invalid column name")

    if col in get_charge_columns():
        raise HTTPException(status_code=400, detail="Column already exists")

    type_map = {
        "string": "VARCHAR",
        "int": "INTEGER",
        "integer": "INTEGER",
        "boolean": "BOOLEAN",
        "bool": "BOOLEAN"
    }

    sql_type = type_map.get(req.column_type.lower())
    if sql_type is None:
        raise HTTPException(status_code=400, detail="Unsupported column type")

    sql = f"ALTER TABLE charges ADD COLUMN {col} {sql_type};"

    try:
        with engine.begin() as conn:
            conn.execute(text(sql))
        return {"status": "success", "added": col}

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))


# --------------------------
# Delete Column (Charges)
# --------------------------
@app.post("/charges/delete-column")
def delete_charge_column(req: DeleteChargeColumnRequest):
    col = req.column_name.strip().lower()

    if col == "id":
        raise HTTPException(status_code=400, detail="Cannot delete ID column")

    if col not in get_charge_columns():
        raise HTTPException(status_code=404, detail="Column does not exist")

    sql = f"ALTER TABLE charges DROP COLUMN {col};"

    try:
        with engine.begin() as conn:
            conn.execute(text(sql))
        return {"status": "success", "deleted": col}

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))


# --------------------------
# Rename Column (Charges)
# --------------------------
@app.post("/charges/rename-column")
def rename_charge_column(req: RenameChargeColumnRequest):
    old = req.old_name.strip().lower()
    new = req.new_name.strip().lower()

    if not old.isidentifier() or not new.isidentifier():
        raise HTTPException(status_code=400, detail="Invalid column names")

    current_cols = get_charge_columns()

    if old not in current_cols:
        raise HTTPException(status_code=404, detail="Old column does not exist")

    if old == "id":
        raise HTTPException(status_code=400, detail="Cannot rename ID column")

    if new in current_cols:
        raise HTTPException(status_code=400, detail="New column name already exists")

    sql = f"ALTER TABLE charges RENAME COLUMN {old} TO {new};"

    try:
        with engine.begin() as conn:
            conn.execute(text(sql))
        return {"status": "success", "renamed_from": old, "renamed_to": new}

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))


# --------------------------
# Create Charge (Dynamic)
# --------------------------
@app.post("/charges")
def create_charge(data: dict = Body(...)):
    allowed_columns = get_charge_columns()
    allowed_columns.remove("id")

    insert_values = {col: data.get(col, None) for col in allowed_columns}

    columns_sql = ", ".join(insert_values.keys())
    params_sql = ", ".join([f":{k}" for k in insert_values.keys()])

    sql = text(f"""
        INSERT INTO charges ({columns_sql})
        VALUES ({params_sql})
        RETURNING id
    """)

    try:
        with engine.begin() as conn:
            result = conn.execute(sql, insert_values)
            new_id = result.scalar()
        return {"created_id": new_id}

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))


# --------------------------
# List Charges
# --------------------------
@app.get("/charges")
def list_charges():
    sql = text("SELECT * FROM charges")

    with engine.connect() as conn:
        rows = conn.execute(sql).fetchall()

    return [dict(row._mapping) for row in rows]








class UpdateChargeField(BaseModel):
    charge_id: int
    column_name: str
    value: str | int | None


@app.put("/charges/update-field")
def update_charge_field(req: UpdateChargeField):
    col = req.column_name.strip().lower()

    allowed_columns = get_charge_columns()

    if col not in allowed_columns:
        raise HTTPException(status_code=400, detail="Column does not exist")

    if col == "id":
        raise HTTPException(status_code=400, detail="Cannot edit ID")

    sql = text(f"UPDATE charges SET {col} = :value WHERE id = :cid")

    try:
        with engine.begin() as conn:
            conn.execute(sql, {"value": req.value, "cid": req.charge_id})

        return {
            "status": "success",
            "updated_column": col,
            "charge_id": req.charge_id,
            "new_value": req.value
        }

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    # ====================== DELETE CHARGE BY ID ======================
@app.delete("/charges/{charge_id}")
def delete_charge(charge_id: int):
    """
    Delete a charge row by its ID.
    Example: DELETE /charges/5 → deletes row with id = 5
    """
    check_sql = text("SELECT 1 FROM charges WHERE id = :cid")
    delete_sql = text("DELETE FROM charges WHERE id = :cid")

    try:
        with engine.begin() as conn:
            # Check if row exists
            exists = conn.execute(check_sql, {"cid": charge_id}).fetchone()
            if not exists:
                raise HTTPException(
                    status_code=404,
                    detail=f"There is no row found with ID {charge_id}"
                )
            
            # Delete the row
            conn.execute(delete_sql, {"cid": charge_id})

        return {
            "status": "success",
            "message": f"Charge with ID {charge_id} has been deleted successfully"
        }

    except HTTPException:
        raise  # Let FastAPI handle the 404
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    
    
    # ============================================================
#                   QUOTATION TABLE SETUP
# ============================================================

quotation_table = Table(
    "quotation",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("customer_name", String),
    Column("contact_person", String),
    Column("designation", String),
    Column("department", String),
    Column("mobile_number", String),
    Column("email_id", String),
    Column("customer_code", String),
    Column("gst_details", String),
    Column("enquiry_ref", String),
    Column("enquiry_date", String),
    Column("payment_terms", String),
    Column("ot_charges", String),
    Column("delivery_period", String),
    Column("place_of_work", String),
    Column("terms_condition_1", String),
    Column("terms_condition_2", String),
    Column("no_person_visiting_1", String),
    Column("no_person_visiting_2", String)
)

metadata.create_all(engine)


# ---------------------- Helper -------------------------
def get_quotation_columns():
    query = """
        SELECT 
            column_name,
            data_type
        FROM information_schema.columns
        WHERE table_name = 'quotation'
        ORDER BY ordinal_position
    """
    with engine.connect() as conn:
        result = conn.execute(text(query))
        return [
            {
                "column_name": row[0],
                "data_type": row[1]
            }
            for row in result
        ]
    
  # ---------------------- List Quotation Columns -------------------------
@app.get("/quotation/columns")
def list_quotation_columns():
    return {"columns": get_quotation_columns()}
  


# ---------------------- Create Quotation -------------------------
@app.post("/quotation")
def create_quotation(data: dict = Body(...)):
    cols = get_quotation_columns()
    cols.remove("id")

    insert_vals = {c: data.get(c, None) for c in cols}

    col_sql = ", ".join(insert_vals.keys())
    param_sql = ", ".join([f":{k}" for k in insert_vals.keys()])

    sql = text(f"""
        INSERT INTO quotation ({col_sql})
        VALUES ({param_sql})
        RETURNING id
    """)

    try:
        with engine.begin() as conn:
            result = conn.execute(sql, insert_vals)
            new_id = result.scalar()
        return {"quotation_id": new_id}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------- List Quotation -------------------------
@app.get("/quotation")
def list_quotation():
    sql = text("SELECT * FROM quotation")
    with engine.connect() as conn:
        rows = conn.execute(sql).fetchall()
    return [dict(row._mapping) for row in rows]


# ---------------------- Update Quotation Field -------------------------
class UpdateQuotationField(BaseModel):
    quotation_id: int
    column_name: str
    value: str | int | None


@app.put("/quotation/update-field")
def update_quotation_field(req: UpdateQuotationField):
    col = req.column_name.lower()
    cols = get_quotation_columns()

    if col not in cols:
        raise HTTPException(status_code=400, detail="Column does not exist")
    if col == "id":
        raise HTTPException(status_code=400, detail="Cannot edit ID column")

    sql = text(f"UPDATE quotation SET {col} = :v WHERE id = :qid")

    try:
        with engine.begin() as conn:
            conn.execute(sql, {"v": req.value, "qid": req.quotation_id})

        return {
            "status": "success",
            "updated_column": col,
            "quotation_id": req.quotation_id,
            "new_value": req.value
        }
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    # ============================================================
#         QUOTATION TABLE - ADD / DELETE / RENAME COLUMNS
# ============================================================

class QuotationColumnRequest(BaseModel):
    column_name: str
    column_type: str = "string"

class QuotationDeleteColumnRequest(BaseModel):
    column_name: str

class QuotationRenameColumnRequest(BaseModel):
    old_name: str
    new_name: str


# Add Column
@app.post("/quotation/add-column")
def add_quotation_column(req: QuotationColumnRequest):
    col = req.column_name.strip().lower()

    if not col.isidentifier():
        raise HTTPException(status_code=400, detail="Invalid column name")

    if col in get_quotation_columns():
        raise HTTPException(status_code=400, detail="Column already exists")

    type_map = {
        "string": "VARCHAR",
        "int": "INTEGER",
        "integer": "INTEGER",
        "boolean": "BOOLEAN",
        "bool": "BOOLEAN"
    }
    sql_type = type_map.get(req.column_type.lower())

    if sql_type is None:
        raise HTTPException(status_code=400, detail="Invalid column type")

    sql = f"ALTER TABLE quotation ADD COLUMN {col} {sql_type};"

    with engine.begin() as conn:
        conn.execute(text(sql))

    return {"status": "success", "added": col}


# Delete Column
@app.post("/quotation/delete-column")
def delete_quotation_column(req: QuotationDeleteColumnRequest):
    col = req.column_name.strip().lower()

    if col not in get_quotation_columns():
        raise HTTPException(status_code=404, detail="Column does not exist")

    sql = f"ALTER TABLE quotation DROP COLUMN {col};"

    with engine.begin() as conn:
        conn.execute(text(sql))

    return {"status": "success", "deleted": col}


# Rename Column
@app.post("/quotation/rename-column")
def rename_quotation_column(req: QuotationRenameColumnRequest):
    old = req.old_name.strip().lower()
    new = req.new_name.strip().lower()

    if old not in get_quotation_columns():
        raise HTTPException(status_code=404, detail="Old column does not exist")

    if old == "id":
        raise HTTPException(status_code=400, detail="Cannot rename ID")

    if new in get_quotation_columns():
        raise HTTPException(status_code=400, detail="New column already exists")

    sql = f"ALTER TABLE quotation RENAME COLUMN {old} TO {new};"

    with engine.begin() as conn:
        conn.execute(text(sql))

    return {"status": "success", "renamed_from": old, "renamed_to": new}



# ============================================================
#                   ITEMS TABLE SETUP
# ============================================================

items_table = Table(
    "items",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("quotation_id", Integer),  # foreign key reference
    Column("sample_activity", String),
    Column("specification", String),
    Column("hsn_sac_code", String),
    Column("qty", Integer),
    Column("unit", String),
    Column("unit_rate", Integer),
    Column("total_cost", Integer)
)

metadata.create_all(engine)


# ---------------------- Helper -------------------------
def get_items_columns():
    query = """
        SELECT 
            column_name,
            data_type
        FROM information_schema.columns
        WHERE table_name = 'items'
        ORDER BY ordinal_position
    """
    with engine.connect() as conn:
        result = conn.execute(text(query))
        return [
            {
                "column_name": row[0],
                "data_type": row[1]
            }
            for row in result
        ]
    
    # ---------------------- List Items Columns -------------------------
@app.get("/items/columns")
def list_items_columns():
    return {"columns": get_items_columns()}



# ---------------------- Create Item -------------------------
@app.post("/items")
def create_item(data: dict = Body(...)):
    cols = get_items_columns()
    cols.remove("id")

    insert_vals = {c: data.get(c, None) for c in cols}

    # FOREIGN KEY VALIDATION
    qid = insert_vals.get("quotation_id")
    if qid:
        q_check = text("SELECT id FROM quotation WHERE id=:id")
        with engine.connect() as conn:
            result = conn.execute(q_check, {"id": qid}).fetchone()
            if result is None:
                raise HTTPException(status_code=404, detail="Quotation ID not found")

    col_sql = ", ".join(insert_vals.keys())
    param_sql = ", ".join([f":{k}" for k in insert_vals.keys()])

    sql = text(f"""
        INSERT INTO items ({col_sql})
        VALUES ({param_sql})
        RETURNING id
    """)

    try:
        with engine.begin() as conn:
            
            result = conn.execute(sql, insert_vals)
            new_id = result.scalar()
        return {"item_id": new_id}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------- List Items -------------------------
@app.get("/items")
def list_items():
    sql = text("SELECT * FROM items")
    with engine.connect() as conn:
        rows = conn.execute(sql).fetchall()
    return [dict(r._mapping) for r in rows]


# ---------------------- Update Item Field -------------------------
class UpdateItemField(BaseModel):
    item_id: int
    column_name: str
    value: str | int | None


@app.put("/items/update-field")
def update_item_field(req: UpdateItemField):
    col = req.column_name.lower()
    cols = get_items_columns()

    if col not in cols:
        raise HTTPException(status_code=400, detail="Column does not exist")
    if col == "id":
        raise HTTPException(status_code=400, detail="Cannot edit ID")

    sql = text(f"UPDATE items SET {col} = :v WHERE id = :iid")

    try:
        with engine.begin() as conn:
            conn.execute(sql, {"v": req.value, "iid": req.item_id})

        return {
            "status": "success",
            "updated_column": col,
            "item_id": req.item_id,
            "new_value": req.value
        }
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    # ============================================================
#         ITEMS TABLE - ADD / DELETE / RENAME COLUMNS
# ============================================================

class ItemColumnRequest(BaseModel):
    column_name: str
    column_type: str = "string"

class ItemDeleteColumnRequest(BaseModel):
    column_name: str

class ItemRenameColumnRequest(BaseModel):
    old_name: str
    new_name: str


# Add Column
@app.post("/items/add-column")
def add_items_column(req: ItemColumnRequest):
    col = req.column_name.strip().lower()

    if not col.isidentifier():
        raise HTTPException(status_code=400, detail="Invalid column name")

    if col in get_items_columns():
        raise HTTPException(status_code=400, detail="Column already exists")

    type_map = {
        "string": "VARCHAR",
        "int": "INTEGER",
        "integer": "INTEGER",
        "boolean": "BOOLEAN",
        "bool": "BOOLEAN"
    }
    sql_type = type_map.get(req.column_type.lower())

    if sql_type is None:
        raise HTTPException(status_code=400, detail="Invalid column type")

    sql = f"ALTER TABLE items ADD COLUMN {col} {sql_type};"

    with engine.begin() as conn:
        conn.execute(text(sql))

    return {"status": "success", "added": col}


# Delete Column
@app.post("/items/delete-column")
def delete_items_column(req: ItemDeleteColumnRequest):
    col = req.column_name.strip().lower()

    if col == "id":
        raise HTTPException(status_code=400, detail="Cannot delete ID")

    columns = get_items_columns()
    column_names = [c["column_name"].lower() for c in columns]

    if col not in column_names:
        raise HTTPException(status_code=404, detail="Column does not exist")

    sql = text(f'ALTER TABLE items DROP COLUMN "{col}"')

    with engine.begin() as conn:
        conn.execute(sql)

    return {"status": "success", "deleted": col}



# Rename Column
@app.post("/items/rename-column")
def rename_items_column(req: ItemRenameColumnRequest):
    old = req.old_name.strip().lower()
    new = req.new_name.strip().lower()

    if old not in get_items_columns():
        raise HTTPException(status_code=404, detail="Old column does not exist")

    if old == "id":
        raise HTTPException(status_code=400, detail="Cannot rename ID")

    if new in get_items_columns():
        raise HTTPException(status_code=400, detail="New column already exists")

    sql = f"ALTER TABLE items RENAME COLUMN {old} TO {new};"

    with engine.begin() as conn:
        conn.execute(text(sql))

    return {"status": "success", "renamed_from": old, "renamed_to": new}

# Add these models and endpoints to your existing code

from typing import List, Optional

# ============================================================
#          PYDANTIC MODELS FOR QUOTATION WITH ITEMS
# ============================================================

class ItemData(BaseModel):
    sample_activity: Optional[str] = None
    specification: Optional[str] = None
    hsn_sac_code: Optional[str] = None
    qty: Optional[int] = None
    unit: Optional[str] = None
    unit_rate: Optional[int] = None
    total_cost: Optional[int] = None


class QuotationWithItemsRequest(BaseModel):
    quotation_data: dict
    items_data: List[dict]


class UpdateQuotationWithItemsRequest(BaseModel):
    quotation_data: Optional[dict] = None
    items_data: Optional[List[dict]] = None
    items_to_delete: Optional[List[int]] = None


# ============================================================
#         CREATE QUOTATION WITH ITEMS (POST)
# ============================================================

from sqlalchemy import text, inspect
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError

@app.post("/quotation-with-items")
def create_quotation_with_items(req: QuotationWithItemsRequest):
    try:
        # Use SQLAlchemy inspector to get real column names safely
        inspector = inspect(engine)
        
        quotation_columns_all = [col["name"] for col in inspector.get_columns("quotation")]
        items_columns_all = [col["name"] for col in inspector.get_columns("items")]

        # Exclude 'id' safely
        quotation_cols = [col for col in quotation_columns_all if col != "id"]
        items_cols = [col for col in items_columns_all if col != "id"]

        # Prepare quotation data (only allowed columns)
        quotation_vals = {c: req.quotation_data.get(c) for c in quotation_cols}

        col_sql = ", ".join(quotation_vals.keys())
        param_sql = ", ".join(f":{k}" for k in quotation_vals.keys())

        quotation_sql = text(f"""
            INSERT INTO quotation ({col_sql})
            VALUES ({param_sql})
            RETURNING id
        """)

        with engine.begin() as conn:
            # Insert quotation
            result = conn.execute(quotation_sql, quotation_vals)
            quotation_id = result.scalar()

            created_items = []

            for item_data in req.items_data:
                item_vals = {c: item_data.get(c) for c in items_cols}
                item_vals["quotation_id"] = quotation_id  # Add foreign key

                item_col_sql = ", ".join(item_vals.keys())
                item_param_sql = ", ".join(f":{k}" for k in item_vals.keys())

                item_sql = text(f"""
                    INSERT INTO items ({item_col_sql})
                    VALUES ({item_param_sql})
                    RETURNING id
                """)

                item_result = conn.execute(item_sql, item_vals)
                item_id = item_result.scalar()
                created_items.append(item_id)

        return {
            "status": "success",
            "quotation_id": quotation_id,
            "items_created": len(created_items),
            "item_ids": created_items
        }

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


# ============================================================
#         GET QUOTATION WITH ITEMS (GET)
# ============================================================

@app.get("/quotation-with-items/{quotation_id}")
def get_quotation_with_items(quotation_id: int):
    """
    Retrieve a quotation along with all its items.
    
    Example: GET /quotation-with-items/1
    """
    
    quotation_sql = text("SELECT * FROM quotation WHERE id = :qid")
    items_sql = text("SELECT * FROM items WHERE quotation_id = :qid")
    
    try:
        with engine.connect() as conn:
            # Get quotation
            quotation_row = conn.execute(quotation_sql, {"qid": quotation_id}).fetchone()
            
            if quotation_row is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Quotation with ID {quotation_id} not found"
                )
            
            # Get all items for this quotation
            items_rows = conn.execute(items_sql, {"qid": quotation_id}).fetchall()
        
        return {
            "quotation": dict(quotation_row._mapping),
            "items": [dict(item._mapping) for item in items_rows]
        }
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
#         GET ALL QUOTATIONS WITH ITEMS (GET)
# ============================================================

@app.get("/quotation-with-items")
def get_all_quotations_with_items():
    """
    Retrieve all quotations along with their items.
    """
    
    quotation_sql = text("SELECT * FROM quotation")
    items_sql = text("SELECT * FROM items WHERE quotation_id = :qid")
    
    try:
        with engine.connect() as conn:
            # Get all quotations
            quotation_rows = conn.execute(quotation_sql).fetchall()
            
            result = []
            for quotation_row in quotation_rows:
                quotation_dict = dict(quotation_row._mapping)
                qid = quotation_dict["id"]
                
                # Get items for this quotation
                items_rows = conn.execute(items_sql, {"qid": qid}).fetchall()
                
                result.append({
                    "quotation": quotation_dict,
                    "items": [dict(item._mapping) for item in items_rows]
                })
        
        return result
        
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
#         UPDATE QUOTATION WITH ITEMS (PUT)
# ============================================================

@app.put("/quotation-with-items/{quotation_id}")
def update_quotation_with_items(quotation_id: int, req: UpdateQuotationWithItemsRequest):
    """
    Update a quotation and its items.
    Can update quotation data, add new items, update existing items, or delete items.
    
    Example payload:
    {
        "quotation_data": {
            "customer_name": "Updated Corp",
            "mobile_number": "9876543210"
        },
        "items_data": [
            {
                "id": 1,  // If id exists, update this item
                "sample_activity": "Updated Testing",
                "qty": 15
            },
            {
                // If no id, create new item
                "sample_activity": "New Activity",
                "qty": 5
            }
        ],
        "items_to_delete": [3, 4]  // Delete items with these IDs
    }
    """
    
    try:
        with engine.begin() as conn:
            # Step 1: Verify quotation exists
            check_sql = text("SELECT 1 FROM quotation WHERE id = :qid")
            exists = conn.execute(check_sql, {"qid": quotation_id}).fetchone()
            
            if not exists:
                raise HTTPException(
                    status_code=404,
                    detail=f"Quotation with ID {quotation_id} not found"
                )
            
            updated_sections = []
            
            # Step 2: Update quotation data if provided
            if req.quotation_data:
                quotation_cols_data = get_quotation_columns()
                # Extract just the column names
                quotation_cols = [col["column_name"].lower() for col in quotation_cols_data]
                
                for col, value in req.quotation_data.items():
                    col_lower = col.lower()
                    if col_lower in quotation_cols and col_lower != "id":
                        update_sql = text(f"UPDATE quotation SET {col_lower} = :v WHERE id = :qid")
                        conn.execute(update_sql, {"v": value, "qid": quotation_id})
                
                updated_sections.append("quotation_data")
            
            # Step 3: Delete items if specified
            deleted_items = []
            if req.items_to_delete:
                for item_id in req.items_to_delete:
                    # Verify item belongs to this quotation
                    verify_sql = text("""
                        SELECT 1 FROM items 
                        WHERE id = :iid AND quotation_id = :qid
                    """)
                    belongs = conn.execute(
                        verify_sql, 
                        {"iid": item_id, "qid": quotation_id}
                    ).fetchone()
                    
                    if belongs:
                        delete_sql = text("DELETE FROM items WHERE id = :iid")
                        conn.execute(delete_sql, {"iid": item_id})
                        deleted_items.append(item_id)
                
                if deleted_items:
                    updated_sections.append("deleted_items")
            
            # Step 4: Update or create items
            updated_items = []
            created_items = []
            
            if req.items_data:
                items_cols_data = get_items_columns()
                # Extract just the column names, excluding 'id'
                items_cols = [col["column_name"].lower() for col in items_cols_data if col["column_name"].lower() != "id"]
                
                for item_data in req.items_data:
                    item_id = item_data.get("id")
                    
                    if item_id:
                        # Update existing item
                        # Verify item belongs to this quotation
                        verify_sql = text("""
                            SELECT 1 FROM items 
                            WHERE id = :iid AND quotation_id = :qid
                        """)
                        belongs = conn.execute(
                            verify_sql,
                            {"iid": item_id, "qid": quotation_id}
                        ).fetchone()
                        
                        if not belongs:
                            continue  # Skip if item doesn't belong to this quotation
                        
                        # Update each field
                        for col, value in item_data.items():
                            col_lower = col.lower()
                            if col_lower in items_cols and col_lower != "quotation_id":
                                update_sql = text(f"UPDATE items SET {col_lower} = :v WHERE id = :iid")
                                conn.execute(update_sql, {"v": value, "iid": item_id})
                        
                        updated_items.append(item_id)
                    
                    else:
                        # Create new item
                        item_vals = {c: item_data.get(c, None) for c in items_cols}
                        item_vals["quotation_id"] = quotation_id
                        
                        item_col_sql = ", ".join(item_vals.keys())
                        item_param_sql = ", ".join([f":{k}" for k in item_vals.keys()])
                        
                        item_sql = text(f"""
                            INSERT INTO items ({item_col_sql})
                            VALUES ({item_param_sql})
                            RETURNING id
                        """)
                        
                        result = conn.execute(item_sql, item_vals)
                        new_item_id = result.scalar()
                        created_items.append(new_item_id)
                
                if updated_items:
                    updated_sections.append("updated_items")
                if created_items:
                    updated_sections.append("created_items")
        
        return {
            "status": "success",
            "quotation_id": quotation_id,
            "updated_sections": updated_sections,
            "items_updated": len(updated_items),
            "items_created": len(created_items),
            "items_deleted": len(deleted_items),
            "updated_item_ids": updated_items,
            "created_item_ids": created_items,
            "deleted_item_ids": deleted_items
        }
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
#         DELETE QUOTATION WITH ITEMS (DELETE)
# ============================================================

@app.delete("/quotation-with-items/{quotation_id}")
def delete_quotation_with_items(quotation_id: int):
    """
    Delete a quotation along with all its related items.
    
    Example: DELETE /quotation-with-items/1
    """
    
    check_sql = text("SELECT 1 FROM quotation WHERE id = :qid")
    count_items_sql = text("SELECT COUNT(*) FROM items WHERE quotation_id = :qid")
    delete_items_sql = text("DELETE FROM items WHERE quotation_id = :qid")
    delete_quotation_sql = text("DELETE FROM quotation WHERE id = :qid")
    
    try:
        with engine.begin() as conn:
            # Check if quotation exists
            exists = conn.execute(check_sql, {"qid": quotation_id}).fetchone()
            
            if not exists:
                raise HTTPException(
                    status_code=404,
                    detail=f"Quotation with ID {quotation_id} not found"
                )
            
            # Count items to be deleted
            items_count = conn.execute(count_items_sql, {"qid": quotation_id}).scalar()
            
            # Delete all items first (foreign key constraint)
            conn.execute(delete_items_sql, {"qid": quotation_id})
            
            # Delete quotation
            conn.execute(delete_quotation_sql, {"qid": quotation_id})
        
        return {
            "status": "success",
            "message": f"Quotation {quotation_id} and its {items_count} items deleted successfully",
            "quotation_id": quotation_id,
            "items_deleted": items_count
        }
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
from sqlalchemy import create_engine, MetaData, Table, Column, String, Integer, text
from sqlalchemy.dialects.postgresql import JSON  # Add this import

# Add user preferences table and models
# Add user preferences table and models
class ColumnOrderRequest(BaseModel):
    column_order: List[str]

user_preferences_table = Table(
    "user_preferences",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", String, default="default"),
    Column("preference_type", String),
    Column("preference_data", String)  # Store JSON as string
)

# Create the table
metadata.create_all(engine)

@app.post("/user-preferences/column-order")
def save_column_order(req: ColumnOrderRequest):
    try:
        # Check if preference exists
        check_sql = text("""
            SELECT id FROM user_preferences 
            WHERE user_id = :user_id AND preference_type = 'column_order'
        """)
        
        with engine.begin() as conn:
            existing = conn.execute(check_sql, {"user_id": "default"}).fetchone()
            
            if existing:
                # Update existing
                update_sql = text("""
                    UPDATE user_preferences 
                    SET preference_data = :data
                    WHERE id = :id
                """)
                conn.execute(update_sql, {"data": json.dumps(req.column_order), "id": existing[0]})
            else:
                # Insert new
                insert_sql = text("""
                    INSERT INTO user_preferences (user_id, preference_type, preference_data)
                    VALUES (:user_id, :pref_type, :data)
                """)
                conn.execute(insert_sql, {
                    "user_id": "default", 
                    "pref_type": "column_order", 
                    "data": json.dumps(req.column_order)
                })
                
        return {"status": "success", "saved": req.column_order}
        
    except Exception as e:
        print(f"Error in save_column_order: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/user-preferences/column-order")
def get_column_order():
    try:
        sql = text("""
            SELECT preference_data FROM user_preferences 
            WHERE user_id = :user_id AND preference_type = 'column_order'
        """)
        
        with engine.connect() as conn:
            result = conn.execute(sql, {"user_id": "default"}).fetchone()
            
            if result and result[0]:
                return {"column_order": json.loads(result[0])}
            else:
                return {"column_order": []}
                
    except Exception as e:
        print(f"Error in get_column_order: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    

# Add this model for global quotation template
class QuotationTemplateRequest(BaseModel):
    template: List[Dict[str, Any]]

# Add global_quotation_template table
global_quotation_template_table = Table(
    "global_quotation_template",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", String, default="default"),
    Column("template_data", String),  # Store JSON as string
    Column("created_at", String),
    Column("updated_at", String)
)

# Create the table
metadata.create_all(engine)

# ============================================================
#         GLOBAL QUOTATION TEMPLATE ENDPOINTS
# ============================================================

@app.post("/user-preferences/global-quotation-template")
def save_global_template(req: QuotationTemplateRequest):
    """
    Save a global template that applies to all quotations.
    This template structure will be used for all quotations with their respective data.
    """
    try:
        from datetime import datetime
        print(f"DEBUG: Saving global template with {len(req.template)} items...")
        timestamp = datetime.now().isoformat()
        
        # Check if global template exists
        check_sql = text("""
            SELECT id FROM global_quotation_template 
            WHERE user_id = :uid
        """)
        
        with engine.begin() as conn:
            existing = conn.execute(check_sql, {
                "uid": "default"
            }).fetchone()
            
            print(f"DEBUG: Existing template: {existing}")
            
            if existing:
                # Update existing template
                print("DEBUG: Updating existing template...")
                update_sql = text("""
                    UPDATE global_quotation_template 
                    SET template_data = :data, updated_at = :updated
                    WHERE id = :id
                """)
                conn.execute(update_sql, {
                    "data": json.dumps(req.template),
                    "updated": timestamp,
                    "id": existing[0]
                })
            else:
                # Insert new template
                print("DEBUG: Inserting new template...")
                insert_sql = text("""
                    INSERT INTO global_quotation_template (user_id, template_data, created_at, updated_at)
                    VALUES (:uid, :data, :created, :updated)
                """)
                conn.execute(insert_sql, {
                    "uid": "default",
                    "data": json.dumps(req.template),
                    "created": timestamp,
                    "updated": timestamp
                })
        
        print("DEBUG: Template saved successfully!")
        return {
            "status": "success",
            "message": "Global template saved successfully. This template will be applied to all quotations."
        }
        
    except Exception as e:
        import traceback
        print(f"ERROR in save_global_template: {str(e)}")
        print(f"TRACEBACK: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/user-preferences/global-quotation-template")
def get_global_template():
    """
    Get the global template that applies to all quotations
    """
    try:
        print("DEBUG: Fetching global template...")
        sql = text("""
            SELECT template_data FROM global_quotation_template 
            WHERE user_id = :uid
        """)
        
        with engine.connect() as conn:
            result = conn.execute(sql, {
                "uid": "default"
            }).fetchone()
            
            print(f"DEBUG: Query result: {result}")
            
            if result and result[0]:
                print(f"DEBUG: Found template data, parsing JSON...")
                return {
                    "template": json.loads(result[0])
                }
            else:
                print("DEBUG: No template found, returning empty array")
                return {
                    "template": []
                }
                
    except Exception as e:
        import traceback
        print(f"ERROR in get_global_template: {str(e)}")
        print(f"TRACEBACK: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/user-preferences/global-quotation-template")
def delete_global_template():
    """
    Delete the global template
    """
    try:
        delete_sql = text("""
            DELETE FROM global_quotation_template 
            WHERE user_id = :uid
        """)
        
        with engine.begin() as conn:
            result = conn.execute(delete_sql, {
                "uid": "default"
            })
            
        return {
            "status": "success",
            "message": "Global template deleted successfully"
        }
        
    except Exception as e:
        print(f"Error in delete_global_template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
