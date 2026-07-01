#!/usr/bin/env python3
"""Run only Hermes Agent's API-server adapter for Desk Robot local integration."""
import asyncio
import os
import sys
from pathlib import Path

HERMES_REPO = Path('/Users/ching/HomeProject/hermes-agent')
sys.path.insert(0, str(HERMES_REPO))

for env_path in (Path('/Users/ching/.hermes/.env'), Path('/Users/ching/HomeProject/desk-robot/.env')):
    if env_path.exists():
        for raw in env_path.read_text().splitlines():
            line = raw.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            os.environ.setdefault(key, value)

os.environ.setdefault('API_SERVER_ENABLED', 'true')
os.environ.setdefault('API_SERVER_HOST', '127.0.0.1')
os.environ.setdefault('API_SERVER_PORT', '8642')

from gateway.config import PlatformConfig
from gateway.platforms.api_server import APIServerAdapter

async def main() -> None:
    adapter = APIServerAdapter(PlatformConfig(enabled=True, extra={
        'host': os.environ['API_SERVER_HOST'],
        'port': int(os.environ['API_SERVER_PORT']),
        'key': os.environ.get('API_SERVER_KEY', ''),
    }))
    ok = await adapter.connect()
    if not ok:
        raise SystemExit('Hermes API server failed to start')
    print(f"Hermes API server listening on {os.environ['API_SERVER_HOST']}:{os.environ['API_SERVER_PORT']}", flush=True)
    try:
        await asyncio.Event().wait()
    finally:
        await adapter.disconnect()

if __name__ == '__main__':
    asyncio.run(main())
