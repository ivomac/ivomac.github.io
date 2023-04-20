import subprocess as sp
from pathlib import Path
import re


def parse_line(line):
    matches = re.match(r"LBA Format  (\d+).*Data Size: (\d+).*Performance: (.*)", line)
    if matches:
        format_id = matches.group(1)
        data_size = matches.group(2)
        quality = matches.group(3)
        return format_id, data_size, quality
    return None


for drive in Path("/dev").glob("nvme*n1"):
    print(f"Drive: {drive}")
    out = sp.run(f"nvme id-ns -H {drive}".split(), capture_output=True)
    stdout = out.stdout.decode()
    info = [pline for line in stdout.split("\n") if (pline := parse_line(line)) is not None]
    for line in info:
        print(f"Format: id={line[0]}, data_size={line[1]}, quality={line[2]}")
    best = min(info, key=lambda x: x[-1][2])
    print("Suggested actions:")
    print(f"nvme format --lbaf={best[0]} {drive}")
    print(f"Then create a partition table with gdisk {drive}")
