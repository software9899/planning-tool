#!/bin/bash

echo "🚀 Setting up Planning Tool on DigitalOcean Droplet"
echo "=================================================="
echo ""

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install Docker Compose
echo "📦 Installing Docker Compose..."
apt install docker-compose -y

# Install Git
echo "📥 Installing Git..."
apt install git -y

# Create app directory
echo "📁 Creating app directory..."
mkdir -p /var/www/planning-tool
cd /var/www/planning-tool

# Clone repository (replace with your repo)
echo "🔄 Please clone your repository manually:"
echo "git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git ."
echo ""
echo "Or if you prefer, transfer files via SCP/SFTP"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Clone your repository to /var/www/planning-tool"
echo "2. Run: cd /var/www/planning-tool"
echo "3. Run: ./start-all.sh"
