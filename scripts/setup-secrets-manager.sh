#!/bin/bash
# Secrets Management Setup for Xpress Ops Tower
# Configures HashiCorp Vault or AWS Secrets Manager integration

set -e

SECRETS_DIR="/Users/nathan/Desktop/claude/Projects/ops-tower/secrets"
VAULT_CONFIG_DIR="${SECRETS_DIR}/vault"
VAULT_DATA_DIR="${SECRETS_DIR}/vault-data"

echo "🔐 Setting up secrets management for Xpress Ops Tower..."

# Create secrets directory structure
mkdir -p "${VAULT_CONFIG_DIR}"
mkdir -p "${VAULT_DATA_DIR}"
mkdir -p "${SECRETS_DIR}/scripts"

# Create Vault configuration
cat > "${VAULT_CONFIG_DIR}/vault.hcl" << EOF
# HashiCorp Vault Configuration for Xpress Ops Tower

ui = true
disable_mlock = true

storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = false
  tls_cert_file = "/vault/ssl/vault.crt"
  tls_key_file = "/vault/ssl/vault.key"
}

api_addr = "https://127.0.0.1:8200"
cluster_addr = "https://127.0.0.1:8201"
EOF

# Create Docker Compose for Vault
cat > "${SECRETS_DIR}/docker-compose.vault.yml" << EOF
version: '3.8'

services:
  vault:
    image: vault:latest
    container_name: xpress-vault
    restart: unless-stopped
    ports:
      - "127.0.0.1:8200:8200"
    volumes:
      - vault_data:/vault/data
      - ./vault/vault.hcl:/vault/config/vault.hcl:ro
      - ./ssl:/vault/ssl:ro
    environment:
      - VAULT_ADDR=https://127.0.0.1:8200
      - VAULT_API_ADDR=https://127.0.0.1:8200
    cap_add:
      - IPC_LOCK
    command: vault server -config=/vault/config/vault.hcl
    healthcheck:
      test: ["CMD", "vault", "status"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - vault-network

volumes:
  vault_data:
    driver: local
    driver_opts:
      type: none
      device: ${VAULT_DATA_DIR}
      o: bind

networks:
  vault-network:
    driver: bridge
    internal: true
EOF

# Create Vault initialization script
cat > "${SECRETS_DIR}/scripts/init-vault.sh" << 'EOF'
#!/bin/bash
# Initialize HashiCorp Vault for Xpress Ops Tower

set -e

export VAULT_ADDR="https://127.0.0.1:8200"
export VAULT_SKIP_VERIFY=true

echo "🔐 Initializing Vault..."

# Check if Vault is already initialized
if vault status 2>/dev/null | grep -q "Initialized.*true"; then
    echo "✅ Vault is already initialized"
    exit 0
fi

# Initialize Vault
echo "🔧 Initializing Vault with 5 key shares and 3 key threshold..."
vault operator init \
    -key-shares=5 \
    -key-threshold=3 \
    -format=json > /tmp/vault-init.json

# Extract unseal keys and root token
UNSEAL_KEY_1=$(jq -r '.unseal_keys_b64[0]' /tmp/vault-init.json)
UNSEAL_KEY_2=$(jq -r '.unseal_keys_b64[1]' /tmp/vault-init.json)
UNSEAL_KEY_3=$(jq -r '.unseal_keys_b64[2]' /tmp/vault-init.json)
ROOT_TOKEN=$(jq -r '.root_token' /tmp/vault-init.json)

echo "🔓 Unsealing Vault..."
vault operator unseal $UNSEAL_KEY_1
vault operator unseal $UNSEAL_KEY_2
vault operator unseal $UNSEAL_KEY_3

# Authenticate with root token
export VAULT_TOKEN=$ROOT_TOKEN

echo "🔧 Configuring Vault policies and secrets..."

# Enable KV secrets engine
vault secrets enable -path=xpress kv-v2

# Create policy for Xpress application
vault policy write xpress-app - << EOL
path "xpress/data/app/*" {
  capabilities = ["read"]
}

path "xpress/data/database/*" {
  capabilities = ["read"]
}

path "xpress/data/integrations/*" {
  capabilities = ["read"]
}
EOL

# Create policy for emergency access
vault policy write xpress-emergency - << EOL
path "xpress/data/*" {
  capabilities = ["read", "list"]
}

path "xpress/data/emergency/*" {
  capabilities = ["read", "create", "update"]
}
EOL

# Store initial secrets
echo "📝 Storing initial secrets..."

# Database secrets
vault kv put xpress/database/postgres \
    username="xpress_writer" \
    password="GENERATED_SECURE_PASSWORD_123!" \
    host="127.0.0.1" \
    port="5432" \
    database="xpress_ops_tower"

vault kv put xpress/database/redis \
    password="GENERATED_REDIS_PASSWORD_456!" \
    host="127.0.0.1" \
    port="6379"

# API keys
vault kv put xpress/integrations/twilio \
    account_sid="REPLACE_WITH_ACTUAL_SID" \
    auth_token="REPLACE_WITH_ACTUAL_TOKEN"

vault kv put xpress/integrations/sendgrid \
    api_key="REPLACE_WITH_ACTUAL_API_KEY"

vault kv put xpress/integrations/google-maps \
    api_key="REPLACE_WITH_ACTUAL_API_KEY"

# JWT secrets
vault kv put xpress/app/jwt \
    access_secret="$(openssl rand -base64 64)" \
    refresh_secret="$(openssl rand -base64 64)"

# Emergency secrets
vault kv put xpress/emergency/access \
    api_key="$(openssl rand -base64 32)" \
    break_glass_token="$(openssl rand -base64 32)"

echo ""
echo "✅ Vault initialization completed successfully!"
echo ""
echo "🚨 CRITICAL - SAVE THESE CREDENTIALS SECURELY:"
echo "   Root Token: $ROOT_TOKEN"
echo "   Unseal Key 1: $UNSEAL_KEY_1"
echo "   Unseal Key 2: $UNSEAL_KEY_2"
echo "   Unseal Key 3: $UNSEAL_KEY_3"
echo ""
echo "🔒 These credentials are required to unseal Vault after restart"
echo "📝 Store them in a secure location (password manager, encrypted file)"

# Cleanup temporary files
rm -f /tmp/vault-init.json

echo "🌐 Vault UI available at: https://127.0.0.1:8200"
EOF

chmod +x "${SECRETS_DIR}/scripts/init-vault.sh"

# Create secrets retrieval utility
cat > "${SECRETS_DIR}/scripts/get-secret.sh" << 'EOF'
#!/bin/bash
# Utility to retrieve secrets from Vault

set -e

export VAULT_ADDR="https://127.0.0.1:8200"
export VAULT_SKIP_VERIFY=true

SECRET_PATH="$1"
SECRET_KEY="$2"

if [ -z "$SECRET_PATH" ] || [ -z "$SECRET_KEY" ]; then
    echo "Usage: $0 <secret-path> <secret-key>"
    echo "Example: $0 xpress/database/postgres username"
    exit 1
fi

# Check if Vault token is set
if [ -z "$VAULT_TOKEN" ]; then
    echo "❌ VAULT_TOKEN environment variable not set"
    exit 1
fi

# Retrieve secret
vault kv get -format=json "$SECRET_PATH" | jq -r ".data.data.$SECRET_KEY"
EOF

chmod +x "${SECRETS_DIR}/scripts/get-secret.sh"

# Create application secrets loader
cat > "${SECRETS_DIR}/scripts/load-app-secrets.sh" << 'EOF'
#!/bin/bash
# Load application secrets from Vault into environment variables

set -e

export VAULT_ADDR="https://127.0.0.1:8200"
export VAULT_SKIP_VERIFY=true

echo "🔐 Loading application secrets from Vault..."

# Check if Vault is available and authenticated
if ! vault token lookup &>/dev/null; then
    echo "❌ Unable to authenticate with Vault"
    exit 1
fi

# Load database secrets
echo "📊 Loading database configuration..."
export DATABASE_PASSWORD=$(vault kv get -format=json xpress/database/postgres | jq -r '.data.data.password')
export REDIS_PASSWORD=$(vault kv get -format=json xpress/database/redis | jq -r '.data.data.password')

# Load integration API keys
echo "🔗 Loading integration API keys..."
export TWILIO_AUTH_TOKEN=$(vault kv get -format=json xpress/integrations/twilio | jq -r '.data.data.auth_token')
export SENDGRID_API_KEY=$(vault kv get -format=json xpress/integrations/sendgrid | jq -r '.data.data.api_key')
export NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$(vault kv get -format=json xpress/integrations/google-maps | jq -r '.data.data.api_key')

# Load JWT secrets
echo "🔑 Loading JWT configuration..."
export JWT_ACCESS_SECRET=$(vault kv get -format=json xpress/app/jwt | jq -r '.data.data.access_secret')
export JWT_REFRESH_SECRET=$(vault kv get -format=json xpress/app/jwt | jq -r '.data.data.refresh_secret')

# Load emergency secrets
echo "🚨 Loading emergency configuration..."
export EMERGENCY_API_KEY=$(vault kv get -format=json xpress/emergency/access | jq -r '.data.data.api_key')

echo "✅ All secrets loaded successfully"
echo "💡 Run 'source scripts/load-app-secrets.sh' to load these into your shell"
EOF

chmod +x "${SECRETS_DIR}/scripts/load-app-secrets.sh"

echo ""
echo "✅ Secrets management setup completed!"
echo ""
echo "📋 Next steps:"
echo "   1. cd ${SECRETS_DIR}"
echo "   2. docker-compose -f docker-compose.vault.yml up -d"
echo "   3. ./scripts/init-vault.sh"
echo "   4. source ./scripts/load-app-secrets.sh (to load secrets)"
echo ""
echo "📁 Files created:"
echo "   - ${VAULT_CONFIG_DIR}/vault.hcl"
echo "   - ${SECRETS_DIR}/docker-compose.vault.yml"
echo "   - ${SECRETS_DIR}/scripts/init-vault.sh"
echo "   - ${SECRETS_DIR}/scripts/get-secret.sh"
echo "   - ${SECRETS_DIR}/scripts/load-app-secrets.sh"