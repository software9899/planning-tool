from sqlalchemy import create_engine, text

# Database connection
engine = create_engine('postgresql://postgres:password@localhost:5432/planning_tool')

# Add new columns
with engine.connect() as conn:
    try:
        conn.execute(text('ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(255)'))
        conn.execute(text('ALTER TABLE users ADD COLUMN IF NOT EXISTS line_manager INTEGER'))
        conn.commit()
        print('✅ Columns added successfully!')
        print('  - position (VARCHAR(255))')
        print('  - line_manager (INTEGER)')
    except Exception as e:
        print(f'❌ Error: {e}')
        conn.rollback()
