# Samples Chrome on-device-model + GPU process RSS/%CPU and GPU "Device Utilization %" every 0.5s -> results/resources.csv
import subprocess, re, time, sys
out = open(sys.argv[1] if len(sys.argv) > 1 else 'results/resources.csv', 'w')
out.write('t,model_rss_mb,model_cpu,gpu_proc_rss_mb,gpu_proc_cpu,gpu_util\n')
while True:
    ps = subprocess.run(['ps', '-axo', 'rss=,%cpu=,command='], capture_output=True, text=True).stdout.splitlines()
    m = [l.split(None, 2) for l in ps if 'on_device_model' in l and 'Google Chrome' in l]
    g = [l.split(None, 2) for l in ps if '--type=gpu-process' in l and 'Google Chrome' in l]
    s = lambda rows, i, k: round(sum(float(r[i]) for r in rows) / k, 1)
    io = subprocess.run(['ioreg', '-r', '-d', '1', '-w', '0', '-c', 'IOAccelerator'], capture_output=True, text=True).stdout
    u = re.search(r'"Device Utilization %"=(\d+)', io)
    out.write(f'{time.time():.1f},{s(m,0,1024)},{s(m,1,1)},{s(g,0,1024)},{s(g,1,1)},{u.group(1) if u else ""}\n'); out.flush()
    time.sleep(0.5)
