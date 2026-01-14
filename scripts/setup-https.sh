#!/bin/bash

echo "🔒 Setting up HTTPS for Virtual Office"
echo "========================================"
echo ""

# Check if domain is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide your domain name"
    echo "Usage: ./setup-https.sh yourdomain.com"
    exit 1
fi

DOMAIN=$1

echo "📌 Domain: $DOMAIN"
echo ""

# Update system
echo "📦 Updating system packages..."
apt update -y

# Install Nginx
echo "🌐 Installing Nginx..."
apt install nginx -y

# Install Certbot
echo "🔐 Installing Certbot (Let's Encrypt)..."
apt install certbot python3-certbot-nginx -y

# Create Nginx config
echo "📝 Creating Nginx configuration..."
cat > /etc/nginx/sites-available/virtualoffice <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # SSL Certificate (will be added by Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Frontend (Planning Tool)
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Virtual Office
    location /virtual-office {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # Socket.IO for Virtual Office
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Enable site
ln -sf /etc/nginx/sites-available/virtualoffice /etc/nginx/sites-enabled/

# Test Nginx config
echo "🧪 Testing Nginx configuration..."
nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Nginx configuration error!"
    exit 1
fi

# Reload Nginx
systemctl reload nginx

# Get SSL Certificate
echo "🔐 Getting SSL certificate from Let's Encrypt..."
echo "⚠️  Make sure your domain DNS is pointing to this server!"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Setup auto-renewal
echo "♻️  Setting up auto-renewal..."
systemctl enable certbot.timer

echo ""
echo "✅ Setup complete!"
echo ""
echo "🌐 Your site is now available at:"
echo "   https://$DOMAIN"
echo ""
echo "🎤 Microphone should now work on Virtual Office!"
echo ""
echo "📝 Next steps:"
echo "1. Visit https://$DOMAIN/virtual-office"
echo "2. Browser will ask for microphone permission"
echo "3. Click 'Allow'"
echo ""
