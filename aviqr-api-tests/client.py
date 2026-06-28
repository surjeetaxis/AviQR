import requests

from config import BASE_URL

TIMEOUT = 15


def _headers(token=None, extra=None):
    h = dict(extra or {})
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def get(path, token=None, headers=None, **kwargs):
    return requests.get(f"{BASE_URL}{path}", headers=_headers(token, headers), timeout=TIMEOUT, **kwargs)


def post(path, token=None, json=None, headers=None, **kwargs):
    return requests.post(f"{BASE_URL}{path}", headers=_headers(token, headers), json=json, timeout=TIMEOUT, **kwargs)


def put(path, token=None, json=None, headers=None, **kwargs):
    return requests.put(f"{BASE_URL}{path}", headers=_headers(token, headers), json=json, timeout=TIMEOUT, **kwargs)


def delete(path, token=None, headers=None, **kwargs):
    return requests.delete(f"{BASE_URL}{path}", headers=_headers(token, headers), timeout=TIMEOUT, **kwargs)
