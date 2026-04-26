# Self-Hosted LLM on DigitalOcean

## Overview

This guide sets up a free, self-hosted LLM on a DigitalOcean droplet using **Ollama**. Your Comfy AI app (hosted on Vercel) will call this droplet for AI responses.

---

## 1. Create a Droplet

- **OS:** Ubuntu 22.04 (LTS)
- **Plan:** Basic — **16 GB RAM / 4 CPUs** (minimum for Llama 3.1 8B)
- **Region:** Closest to you (e.g., London, NYC, Singapore)
- **Authentication:** SSH key (recommended) or password
- **Cost:** ~$24/month (or ~$0.036/hour if you destroy when not using)

**Budget tip:** You can use a **CPU-Optimized 8 GB** droplet (~$12/month) with a quantized 4-bit model. Slower but works.

---

## 2. Connect & Install Ollama

SSH into your droplet:

```bash
ssh root@YOUR_DROPLET_IP
```

Install Ollama:

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

Pull a model (Llama 3.1 8B is a good all-rounder):

```bash
ollama pull llama3.1:8b
```

Test it:

```bash
ollama run llama3.1:8b
# Type a message, then /bye to exit
```

---

## 3. Expose Ollama API

Ollama runs locally on port `11434`. You need to expose it so Vercel can reach it.

### Option A: Bind to 0.0.0.0 (simple, **not secure** — fine for testing only)

```bash
export OLLAMA_HOST=0.0.0.0:11434
ollama serve
```

Or make it permanent:

```bash
sudo systemctl edit ollama.service
```

Add:

```ini
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

### Option B: Caddy reverse proxy + basic auth (recommended for production)

Install Caddy:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

Create a basic auth password:

```bash
sudo apt install apache2-utils
htpasswd -nbB admin YOUR_PASSWORD_HERE | sudo tee /etc/caddy/.htpasswd
```

Edit Caddyfile:

```bash
sudo nano /etc/caddy/Caddyfile
```

Replace contents with:

```
your-droplet-ip:80 {
    basicauth {
        admin $2a$14$...
    }
    reverse_proxy localhost:11434
}
```

Restart Caddy:

```bash
sudo systemctl reload caddy
```

---

## 4. Firewall

Open port 11434 (or 80 if using Caddy):

```bash
sudo ufw allow 11434/tcp  # or 80/tcp
sudo ufw enable
```

---

## 5. Connect Comfy AI

### Option A: Direct (no auth)

In Vercel dashboard → Settings → Environment Variables:

```
OLLAMA_API_URL=http://YOUR_DROPLET_IP:11434
```

### Option B: With auth (Caddy)

```
OLLAMA_API_URL=http://your-droplet-ip
OLLAMA_API_KEY=YOUR_PASSWORD_HERE
```

Redeploy on Vercel after adding env vars.

---

## 6. Test Locally (before Vercel)

```bash
curl http://YOUR_DROPLET_IP:11434/api/chat -d '{
  "model": "llama3.1:8b",
  "messages": [{"role": "user", "content": "Hello!"}],
  "stream": false
}'
```

If you get a JSON response, it works.

---

## 7. Optional: Auto-start Ollama on boot

```bash
sudo systemctl enable ollama
```

---

## Models to Try

| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| `llama3.1:8b` | 8B | Fast | Good | General chat, coding |
| `llama3.2:3b` | 3B | Very fast | Okay | Simple tasks, low RAM |
| `codellama:7b` | 7B | Fast | Good | Code generation |
| `mistral:7b` | 7B | Fast | Great | General chat |
| `phi4` | ~14B | Medium | Very good | Reasoning, complex tasks |

Pull any model with:

```bash
ollama pull model-name
```

Update `model` in `app/api/chat/route.ts` or pass it from the frontend.

---

## Security Checklist

- [ ] Do NOT expose port 11434 to the public internet without auth
- [ ] Use a firewall (UFW) to block all ports except 22 (SSH) and 80/11434
- [ ] Consider using Caddy + basic auth or Cloudflare Tunnel
- [ ] Regularly update Ollama: `sudo apt update && sudo apt upgrade`

---

## Cost Summary

| Setup | Monthly Cost |
|-------|-------------|
| DO Basic 16GB | ~$24 |
| DO CPU-Opt 8GB | ~$12 |
| Vercel Hobby | **Free** |
| **Total** | **$0 - $24/month** |

Compare to Claude API: $0.25 - $5+ per hour of usage. Self-hosting pays for itself quickly.
