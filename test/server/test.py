import sys
sys.path.insert(0, 'src/server')

import main

def test_trivial():
    assert main.http_info

