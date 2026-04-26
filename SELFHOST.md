# Self-Hosted LLM on DigitalOcean

## Overview

This guide sets up a free, self-hosted LLM on a DigitalOcean droplet using **Ollama**. Your Comfy AI app (hosted on Vercel) will call this droplet for AI responses.

---

## 1. Create a Droplet

- **OS:** Ubuntu 24.04 (LTS)
- **Plan:** General Purpose — **8 GB RAM / 4 CPUs** (minimum for Llama 3.1 8B)
- **Region:** Closest to you (e.g., Singapore, London, NYC)
- **Authentication:** SSH key (never password)
- **Cost:** ~$48/month

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

Test it locally:

```bash
ollama run llama3.1:8b
# Type a message, then /bye to exit
```

---

## 3. Secure Ollama with Caddy + Basic Auth

**Never expose port 11434 directly to the internet.** Use Caddy as a reverse proxy with basic authentication.

Install Caddy:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy apache2-utils
```

Create a basic auth password:

```bash
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
        admin $2y$05$...
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

Only open ports you actually need:

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # Caddy (Ollama proxy)
sudo ufw --force enable
```

**Do NOT open port 11434.**

---

## 5. Connect Comfy AI

In Vercel dashboard → Settings → Environment Variables:

```
OLLAMA_API_URL=http://YOUR_DROPLET_IP
OLLAMA_API_KEY=YOUR_PASSWORD_HERE
```

Redeploy on Vercel after adding env vars.

---

## 6. Test Locally (before Vercel)

```bash
curl -u admin:YOUR_PASSWORD http://YOUR_DROPLET_IP/api/chat -d '{
  "model": "llama3.1:8b",
  "messages": [{"role": "user", "content": "Hello!"}],
  "stream": false
}'
```

If you get a JSON response, it works.

---

## 7. Auto-start on Boot

```bash
sudo systemctl enable ollama
sudo systemctl enable caddy
```

---

## 8. Server Hardening Checklist

These steps protect your server from attacks.

### 8.1 Disable Root Login & Password Auth

Edit SSH config:

```bash
sudo nano /etc/ssh/sshd_config
```

Set these values:

```
PermitRootLogin prohibit-password
PasswordAuthentication no
PubkeyAuthentication yes
```

Restart SSH:

```bash
sudo systemctl restart sshd
```

### 8.2 Create a Non-Root User (Recommended)

```bash
adduser stuie
usermod -aG sudo stuie
```

Then log in as `stuie` and disable root SSH entirely:

```bash
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart sshd
```

### 8.3 Automatic Security Updates

```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
# Select "Yes"
```

### 8.4 Install Fail2Ban (Blocks brute-force attempts)

```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 8.5 Remove Unnecessary Services

```bash
sudo apt autoremove
```

### 8.6 Monitor for Intrusion Attempts

```bash
sudo grep "Failed password" /var/log/auth.log
sudo grep "Invalid user" /var/log/auth.log
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

---

## Cost Summary

| Setup | Monthly Cost |
|-------|-------------|
| DO General Purpose 8GB | ~$48 |
| Vercel Hobby | **Free** |
| **Total** | **~$48/month** |

Compare to Claude API: $0.25 - $5+ per hour of usage. Self-hosting pays for itself quickly.
