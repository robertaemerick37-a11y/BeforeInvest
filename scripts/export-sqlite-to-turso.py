import argparse
import math
import sqlite3
import sys
from pathlib import Path


TABLE_COLUMNS = {
    "users": (
        "id",
        "email",
        "password",
        "role",
        "balance",
        "profile_data",
        "email_lookup",
        "token_version",
        "created_at",
    ),
    "password_reset_tokens": (
        "id",
        "user_id",
        "token_hash",
        "expires_at",
        "created_at",
    ),
    "user_transactions": ("id", "user_id", "details", "status", "created_at"),
    "account_ledger": ("id", "user_id", "details", "created_at"),
}


def sql_value(value):
    if value is None:
        return "NULL"
    if isinstance(value, bytes):
        return f"X'{value.hex()}'"
    if isinstance(value, str):
        return "'" + value.replace("'", "''") + "'"
    if isinstance(value, float) and not math.isfinite(value):
        raise ValueError("The SQLite database contains a non-finite numeric value.")
    return str(value)


def quote_identifier(identifier):
    return '"' + identifier.replace('"', '""') + '"'


def export_database(source, destination):
    if not source.is_file():
        raise FileNotFoundError(f"SQLite database not found: {source}")
    if destination.exists():
        raise FileExistsError(f"Export file already exists: {destination}")

    connection = sqlite3.connect(source.resolve().as_uri() + "?mode=ro", uri=True)
    counts = {}
    created_output = False
    try:
        existing_tables = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            )
        }
        if "users" not in existing_tables:
            raise ValueError("The SQLite database does not contain a users table.")

        with destination.open("x", encoding="utf-8", newline="\n") as output:
            created_output = True
            output.write("BEGIN;\n")
            for table, expected_columns in TABLE_COLUMNS.items():
                if table not in existing_tables:
                    continue

                available_columns = {
                    row[1]
                    for row in connection.execute(
                        f"PRAGMA table_info({quote_identifier(table)})"
                    )
                }
                columns = [column for column in expected_columns if column in available_columns]
                if not columns:
                    continue

                column_sql = ", ".join(quote_identifier(column) for column in columns)
                cursor = connection.execute(
                    f"SELECT {column_sql} FROM {quote_identifier(table)}"
                )
                count = 0
                for row in cursor:
                    values = ", ".join(sql_value(value) for value in row)
                    output.write(
                        f"INSERT INTO {quote_identifier(table)} ({column_sql}) "
                        f"VALUES ({values});\n"
                    )
                    count += 1
                counts[table] = count
            output.write("COMMIT;\n")
    except (OSError, sqlite3.Error, ValueError):
        if created_output:
            destination.unlink()
        raise
    finally:
        connection.close()

    return counts


def main():
    parser = argparse.ArgumentParser(
        description="Export local SQLite account data as SQL for a fresh Turso database."
    )
    parser.add_argument("database", type=Path, help="Path to the local users.db file")
    parser.add_argument(
        "output",
        type=Path,
        help="Private SQL export file; choose a location outside the web root",
    )
    args = parser.parse_args()

    try:
        counts = export_database(args.database, args.output)
    except (OSError, sqlite3.Error, ValueError) as error:
        print(f"Export failed: {error}", file=sys.stderr)
        return 1

    summary = ", ".join(f"{table}: {count}" for table, count in counts.items())
    print(f"Created {args.output} ({summary}).")
    print("This file contains sensitive account data; do not commit or share it.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
