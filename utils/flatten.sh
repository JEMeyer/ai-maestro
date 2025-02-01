#!/bin/bash

# Script to flatten a directory structure, preserving path information in filenames
# Excludes .git and node_modules directories, .DS_Store, .gitignore, and itself
# Renames .env files to dotenv.txt and Dockerfile to docker-file.txt
# Ignores files ending with .png, .log, or ~
# Prints detailed information about each file processed

SRC_DIR="$(pwd)/.."
DST_DIR="tmp"

echo "[INFO] $0"
echo "[INFO] Flattens the directory structure of $SRC_DIR into $DST_DIR"
echo "[INFO] Excludes .git and node_modules directories, .DS_Store, .gitignore, and itself"
echo "[INFO] Ignores files ending with .png, .log, or ~"
echo "[INFO] Renames .env files to dotenv.txt and Dockerfile to docker-file.txt"

# Check if source directory exists
if [ ! -d "$SRC_DIR" ]; then
    echo "[ERROR] Source directory '$SRC_DIR' does not exist."
    exit 1
fi

# Create destination directory if it doesn't exist
mkdir -p "$DST_DIR"

# Function to sanitize and rename filename
sanitize_and_rename_filename() {
    local filename=$(basename "$1")
    local dirname=$(dirname "$1")

    # Handle .env files
    if [[ $filename == .env* ]]; then
        filename="dotenv${filename#.env}.txt"
    fi

    # Handle Dockerfile
    if [[ $filename == Dockerfile* ]]; then
        filename="${filename}.txt"
    fi

    # Sanitize the rest of the filename
    filename=$(echo "$filename" | sed -e 's/[^A-Za-z0-9._-]/_/g')

    echo "${dirname}/${filename}"
}

# Get the name of this script
SCRIPT_NAME=$(basename "$0")

# Count the number of files in the source directory (with exclusions)
src_file_count=$(find "$SRC_DIR" -type f \
    -not -path "*/\.git/*" \
    -not -path "*/node_modules/*" \
    -not -path "*/venv/*" \
    -not -name ".DS_Store" \
    -not -name ".gitignore" \
    -not -name "$SCRIPT_NAME" \
    -not -name "*.png" \
    -not -name "*.log" \
    -not -name "*~" \
    -not -path "*/coverage/*" | wc -l)

echo "[INFO] Total files in source directory (excluding .git, node_modules, .DS_Store, .gitignore, $SCRIPT_NAME, *.png, *.log, and *~): $src_file_count"
echo "[INFO] Starting file copy process..."

# Create a temporary file to store the list of processed files
temp_file=$(mktemp)

# Loop through each file in the source directory, with exclusions
find "$SRC_DIR" -type f \
    -not -path "*/\.git/*" \
    -not -path "*/venv/*" \
    -not -path "*/node_modules/*" \
    -not -name "pnpm-lock.yaml" \
    -not -name ".DS_Store" \
    -not -name ".gitignore" \
    -not -name "$SCRIPT_NAME" \
    -not -name "*.png" \
    -not -name "*.log" \
    -not -name "*~" \
    -not -path "*/coverage/*" \
    -print0 | while IFS= read -r -d '' src_file; do
    # Create a unique filename based on its full path
    rel_path="${src_file#$SRC_DIR/}"
    sanitized_path=$(sanitize_and_rename_filename "$rel_path")
    dst_file="${sanitized_path//\//_}"

    # Log the file processing
    echo "[INFO] Processing: $src_file -> $DST_DIR/$dst_file" >> "$temp_file"

    # Copy the file to the destination directory
    cp "$src_file" "$DST_DIR/$dst_file"
done

# Debugging: Check if any files from coverage/ were processed
grep "coverage/" "$temp_file" && echo "[WARNING] Files from coverage/ directory were processed!"

tree -f -a code | grep -vE '(\.DS_Store|node_module|\.git|\.png|\.log|~)' > $DST_DIR/PROJECT_DIRECTORY_STRUCTURE.txt

# Clean up the temporary file
rm "$temp_file"
