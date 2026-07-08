#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/delete_so_files.sh [--dry-run] [--all]

Delete .so files in this repository.

Options:
  --dry-run  Show matching files without deleting them.
  --all      Search the entire repository, including hidden directories such as .venv.
  -h, --help Show this help message.

By default, the script only scans source directories in this repo to avoid deleting
third-party binary extensions from local environments.
EOF
}

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dry_run=0
search_all=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run)
      dry_run=1
      ;;
    --all)
      search_all=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

if [ "$search_all" -eq 1 ]; then
  search_paths=("$repo_root")
else
  search_paths=()
  for path in backend frontend scripts; do
    if [ -d "$repo_root/$path" ]; then
      search_paths+=("$repo_root/$path")
    fi
  done
fi

if [ "${#search_paths[@]}" -eq 0 ]; then
  echo "No searchable directories found." >&2
  exit 1
fi

matches=()
while IFS= read -r file; do
  matches+=("$file")
done < <(find "${search_paths[@]}" -type f -name '*.so' | sort)

if [ "${#matches[@]}" -eq 0 ]; then
  echo "No .so files found."
  exit 0
fi

printf '%s\n' "${matches[@]}"

if [ "$dry_run" -eq 1 ]; then
  echo "Dry run only. Found ${#matches[@]} .so file(s)."
  exit 0
fi

rm -f -- "${matches[@]}"
echo "Deleted ${#matches[@]} .so file(s)."
