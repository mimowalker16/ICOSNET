"""
Probe functions for PING, TCP, and HTTP_GET checks.

Each function returns a ProbeResult. The real network calls are used when the
Celery worker runs; the simulate_scenario management command bypasses these
entirely by injecting a forced ProbeResult directly into handle_probe_result().
"""
import platform
import socket
import subprocess
import time
from dataclasses import dataclass, field
from typing import Optional

import requests


@dataclass
class ProbeResult:
    status: str                          # 'UP' | 'DOWN' | 'DEGRADED'
    response_time_ms: Optional[int] = None
    error_message: str = ''


def probe_ping(host: str, timeout: int = 3) -> ProbeResult:
    """ICMP ping — works on both Linux (one dash) and Windows (/n /w)."""
    system = platform.system().lower()
    if system == 'windows':
        cmd = ['ping', '-n', '1', '-w', str(timeout * 1000), host]
    else:
        cmd = ['ping', '-c', '1', '-W', str(timeout), host]

    start = time.monotonic()
    try:
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout + 2,
        )
        elapsed_ms = int((time.monotonic() - start) * 1000)
        if result.returncode == 0:
            status = 'UP' if elapsed_ms < timeout * 800 else 'DEGRADED'
            return ProbeResult(status=status, response_time_ms=elapsed_ms)
        return ProbeResult(status='DOWN', error_message='Ping returned non-zero exit code')
    except subprocess.TimeoutExpired:
        return ProbeResult(status='DOWN', error_message='Ping timed out')
    except Exception as exc:
        return ProbeResult(status='DOWN', error_message=str(exc))


def probe_tcp(host: str, port: int, timeout: int = 5) -> ProbeResult:
    """TCP socket connection check."""
    start = time.monotonic()
    try:
        with socket.create_connection((host, port), timeout=timeout):
            elapsed_ms = int((time.monotonic() - start) * 1000)
            return ProbeResult(status='UP', response_time_ms=elapsed_ms)
    except (socket.timeout, ConnectionRefusedError) as exc:
        return ProbeResult(status='DOWN', error_message=str(exc))
    except Exception as exc:
        return ProbeResult(status='DOWN', error_message=str(exc))


def probe_http(url: str, timeout: int = 10) -> ProbeResult:
    """HTTP GET check — UP on 2xx, DEGRADED on 3xx/4xx, DOWN on error or 5xx."""
    start = time.monotonic()
    try:
        response = requests.get(url, timeout=timeout, verify=False, allow_redirects=True)
        elapsed_ms = int((time.monotonic() - start) * 1000)
        if response.status_code < 400:
            status = 'UP' if elapsed_ms < timeout * 700 else 'DEGRADED'
            return ProbeResult(status=status, response_time_ms=elapsed_ms)
        return ProbeResult(
            status='DOWN',
            response_time_ms=elapsed_ms,
            error_message=f'HTTP {response.status_code}',
        )
    except requests.Timeout:
        return ProbeResult(status='DOWN', error_message='HTTP request timed out')
    except requests.ConnectionError as exc:
        return ProbeResult(status='DOWN', error_message=str(exc))
    except Exception as exc:
        return ProbeResult(status='DOWN', error_message=str(exc))


def run_probe(asset) -> ProbeResult:
    """Dispatch to the correct probe based on asset.check_type."""
    if asset.check_type == 'PING':
        return probe_ping(asset.ip_address_or_url)
    elif asset.check_type == 'TCP':
        port = asset.check_port or 80
        return probe_tcp(asset.ip_address_or_url, port)
    else:  # HTTP_GET
        return probe_http(asset.ip_address_or_url)
