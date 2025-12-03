from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, MetaData, Table, Column, String, Integer, text
from sqlalchemy.exc import SQLAlchemyError

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

# Base table
users_table = Table(
    "users",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("username", String),
    Column("password", String)
)

metadata.create_all(engine)

# --------------------------
# Pydantic Models
# --------------------------
class AddColumnRequest(BaseModel):
    column_name: str
    column_type: str = "string"

class DeleteColumnRequest(BaseModel):
    column_name: str

class UpdateUserField(BaseModel):
    user_id: int
    column_name: str
    value: str | int | None


class UpdateSubGroup(BaseModel):
    user_id: int
    sub_group: str


# --------------------------
# Helper: Get Table Columns
# --------------------------
def get_current_columns():
    query = """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='users'
    """
    with engine.connect() as conn:
        result = conn.execute(text(query))
        return [row[0] for row in result]


# --------------------------
# List Columns
# --------------------------
@app.get("/columns")
def list_columns():
    return {"columns": get_current_columns()}


# --------------------------
# Add Column
# --------------------------
@app.post("/add-column")
def add_column(req: AddColumnRequest):
    col = req.column_name.strip().lower()

    if not col.isidentifier():
        raise HTTPException(status_code=400, detail="Invalid column name")

    if col in get_current_columns():
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

    sql = f"ALTER TABLE users ADD COLUMN {col} {sql_type};"

    try:
        with engine.begin() as conn:
            conn.execute(text(sql))
        return {"status": "success", "added": col}

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))


# --------------------------
# Delete Column
# --------------------------
@app.post("/delete-column")
def delete_column(req: DeleteColumnRequest):
    col = req.column_name.strip().lower()

    if col == "id":
        raise HTTPException(status_code=400, detail="Cannot delete ID column")

    if col not in get_current_columns():
        raise HTTPException(status_code=404, detail="Column does not exist")

    sql = f"ALTER TABLE users DROP COLUMN {col};"

    try:
        with engine.begin() as conn:
            conn.execute(text(sql))
        return {"status": "success", "deleted": col}

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))


# --------------------------
# Create User (Dynamic)
# --------------------------
@app.post("/users")
def create_user(data: dict = Body(...)):
    allowed_columns = get_current_columns()
    allowed_columns.remove("id")

    insert_values = {col: data.get(col, None) for col in allowed_columns}

    columns_sql = ", ".join(insert_values.keys())
    params_sql = ", ".join([f":{k}" for k in insert_values.keys()])

    sql = text(f"""
        INSERT INTO users ({columns_sql})
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
# Get Users
# --------------------------
@app.get("/users")
def list_users():
    sql = text("SELECT * FROM users")

    with engine.connect() as conn:
        rows = conn.execute(sql).fetchall()

    return [dict(row._mapping) for row in rows]


class RenameColumnRequest(BaseModel):
    old_name: str
    new_name: str


@app.post("/rename-column")
def rename_column(req: RenameColumnRequest):
    old = req.old_name.strip().lower()
    new = req.new_name.strip().lower()

    # Validate identifiers
    if not old.isidentifier() or not new.isidentifier():
        raise HTTPException(status_code=400, detail="Invalid column name format")

    current_columns = get_current_columns()

    # Check old column exists
    if old not in current_columns:
        raise HTTPException(status_code=404, detail="Old column does not exist")

    # Prevent renaming the primary key
    if old == "id":
        raise HTTPException(status_code=400, detail="Cannot rename ID column")

    # Check new column does not already exist
    if new in current_columns:
        raise HTTPException(status_code=400, detail="New column name already exists")

    # SQL for renaming
    sql = f"ALTER TABLE users RENAME COLUMN {old} TO {new};"

    try:
        with engine.begin() as conn:
            conn.execute(text(sql))
        return {"status": "success", "renamed_from": old, "renamed_to": new}

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    
    
    
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
        SELECT column_name FROM information_schema.columns
        WHERE table_name='quotation'
    """
    with engine.connect() as conn:
        result = conn.execute(text(query))
        return [row[0] for row in result]
    
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

    if col == "id":
        raise HTTPException(status_code=400, detail="Cannot delete ID")

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
        SELECT column_name FROM information_schema.columns
        WHERE table_name='items'
    """
    with engine.connect() as conn:
        result = conn.execute(text(query))
        return [row[0] for row in result]
    
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

    if col not in get_items_columns():
        raise HTTPException(status_code=404, detail="Column does not exist")

    sql = f"ALTER TABLE items DROP COLUMN {col};"

    with engine.begin() as conn:
        conn.execute(text(sql))

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

    