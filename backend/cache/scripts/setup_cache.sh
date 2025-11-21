#!/bin/bash
# Quick setup script for caching system
# Run this to set up everything automatically

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        🚀 Cache System Setup Script 🚀                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get project root directory (scripts are in cache/scripts/, so go up 2 levels)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$BACKEND_DIR")"

echo -e "${BLUE}Project root: $PROJECT_ROOT${NC}"
echo ""

# Step 1: Check Python
echo -e "${BLUE}Step 1: Checking Python...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}❌ Python 3 not found. Please install Python 3.9+${NC}"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
echo -e "${GREEN}✅ Found: $PYTHON_VERSION${NC}"
echo ""

# Step 2: Create virtual environment
echo -e "${BLUE}Step 2: Creating virtual environment...${NC}"
VENV_PATH="$PROJECT_ROOT/venv-backend"
if [ -d "$VENV_PATH" ]; then
    echo -e "${YELLOW}⚠️  Virtual environment already exists at $VENV_PATH${NC}"
    read -p "Do you want to recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Removing old virtual environment..."
        rm -rf "$VENV_PATH"
        python3 -m venv "$VENV_PATH"
        echo -e "${GREEN}✅ Virtual environment created${NC}"
    else
        echo -e "${GREEN}✅ Using existing virtual environment${NC}"
    fi
else
    python3 -m venv "$VENV_PATH"
    echo -e "${GREEN}✅ Virtual environment created${NC}"
fi
echo ""

# Step 3: Activate and upgrade pip
echo -e "${BLUE}Step 3: Activating virtual environment and upgrading pip...${NC}"
source "$VENV_PATH/bin/activate"
pip install --upgrade pip --quiet
echo -e "${GREEN}✅ Pip upgraded${NC}"
echo ""

# Step 4: Install dependencies
echo -e "${BLUE}Step 4: Installing dependencies...${NC}"
cd "$BACKEND_DIR"
pip install -r requirements.txt
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 5: Verify installation
echo -e "${BLUE}Step 5: Verifying installation...${NC}"
python -c "import fastapi, cachetools, aioboto3, dotenv; print('✅ All packages installed!')" || {
    echo -e "${YELLOW}❌ Some packages missing. Reinstalling...${NC}"
    pip install -r requirements.txt
}
echo ""

# Step 6: Check .env file
echo -e "${BLUE}Step 6: Checking environment configuration...${NC}"
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo "Creating .env.example..."
    cat > "$BACKEND_DIR/.env.example" << 'ENVEXAMPLE'
# AWS Configuration
AWS_REGION=us-east-2
S3_BUCKET_NAME=capstone-soccer-data
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# Optional: S3 timeout (default: 30 seconds)
S3_TIMEOUT_SECONDS=30
ENVEXAMPLE
    echo -e "${YELLOW}Please create .env file with your AWS credentials${NC}"
    echo "Copy .env.example to .env and fill in your credentials"
else
    echo -e "${GREEN}✅ .env file found${NC}"
    # Check if credentials are set
    source "$BACKEND_DIR/.env" 2>/dev/null || true
    if [ -z "$AWS_ACCESS_KEY_ID" ] || [ "$AWS_ACCESS_KEY_ID" = "your_access_key_here" ]; then
        echo -e "${YELLOW}⚠️  AWS credentials not configured in .env${NC}"
    else
        echo -e "${GREEN}✅ AWS credentials configured${NC}"
    fi
fi
echo ""

# Step 7: Run tests
echo -e "${BLUE}Step 7: Running cache tests...${NC}"
TEST_DIR="$BACKEND_DIR/cache/tests"
if [ -f "$TEST_DIR/test_cache.py" ]; then
    cd "$BACKEND_DIR"
    python "$TEST_DIR/test_cache.py" && echo -e "${GREEN}✅ Cache tests passed${NC}" || echo -e "${YELLOW}⚠️  Some tests failed (check output above)${NC}"
else
    echo -e "${YELLOW}⚠️  test_cache.py not found, skipping tests${NC}"
fi
echo ""

# Summary
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              ✅ SETUP COMPLETE! ✅                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo ""
echo "1. Activate virtual environment:"
echo "   source $VENV_PATH/bin/activate"
echo ""
echo "2. Configure .env file (if not done):"
echo "   cd $BACKEND_DIR"
echo "   # Edit .env with your AWS credentials"
echo ""
echo "3. Start the server:"
echo "   cd $BACKEND_DIR"
echo "   uvicorn app:app --reload"
echo ""
echo "4. Test the cache:"
echo "   curl http://localhost:8000/api/cache/stats"
echo ""
echo "For detailed instructions, see: cache/docs/CACHE_SETUP_GUIDE.md"
echo ""

