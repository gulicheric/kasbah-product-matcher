# Kasbah 50K Product Matcher 🚀

A high-performance product matching system using vector embeddings, designed to handle 50,000+ products with sub-3-second response times.

## 🎯 Features

- **Vector-based Semantic Search**: Uses OpenAI embeddings with Pinecone for similarity matching
- **Multi-layer Caching**: Redis + in-memory cache for 70%+ hit rates
- **Smart Scoring Algorithm**: Combines semantic similarity, price, location, and lead time
- **Batch Processing**: Handles up to 20 products per request efficiently
- **Real-time Performance**: Sub-3 second response times for typical queries
- **Firebase Integration**: Uses existing Kasbah Firebase project

## 🏗️ Architecture

```
Supply List → Embeddings → Pinecone Query → Scoring → Firebase Details → Results
     ↓            ↓             ↓            ↓           ↓              ↓
  Text Input → Vector Cache → Vector DB → Multi-factor → Product DB → JSON Response
```

## 📋 Prerequisites

1. **Pinecone Account** (Free tier: 100K vectors)
2. **Redis** (Local or Redis Labs free tier)
3. **OpenAI API Key** (for embeddings)
4. **Firebase Project** (Already configured in your creds)

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Create .env file with your API keys
cp .env.example .env
```

Update `.env` with:
- `PINECONE_API_KEY`: Your Pinecone API key
- `OPENAI_API_KEY`: Your OpenAI API key
- Redis URL (default: local Redis)

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Pinecone Index

```bash
npm run setup-pinecone
```

### 4. Sync Your Products (One-time)

```bash
npm run sync
```

This will:
- Generate embeddings for all products
- Upload vectors to Pinecone
- Take ~20-30 minutes for 50K products

### 5. Start the Server

```bash
npm run dev
```

### 6. Test the System

```bash
npm test

# Or test the API directly
curl -X POST http://localhost:8080/test-match
```

## 📡 API Endpoints

### POST `/generate-products`

Match products from a supply list.

```json
{
  "supplyList": [
    {
      "description": "stainless steel bolts M8 x 50mm",
      "category": "fasteners",
      "minQuantity": 500,
      "targetPrice": 100,
      "maxLeadTime": 14
    }
  ],
  "userContext": {
    "location": {
      "geohash": "9q8yyk",
      "city": "San Francisco"
    },
    "userId": "user123"
  }
}
```

Response:
```json
{
  "success": true,
  "products": [
    {
      "name": "M8x50mm Stainless Steel Hex Bolts",
      "price": 89.99,
      "availableQty": 1000,
      "leadTime": 7,
      "matchScore": 0.94,
      "vectorScore": 0.91
    }
  ],
  "metadata": {
    "processingTime": "2847ms",
    "itemsProcessed": 1,
    "timestamp": "2024-08-26T10:30:00.000Z"
  }
}
```

### GET `/health`

Health check endpoint.

### POST `/test-match`

Test endpoint with sample data.

## 🧮 Scoring Algorithm

The system uses a weighted scoring approach:

- **40% Semantic Similarity**: Vector cosine similarity
- **30% Price Match**: How close to target price
- **20% Location**: Geohash-based proximity
- **10% Lead Time**: Delivery time preference

```javascript
finalScore = vectorScore * 0.4 + priceScore * 0.3 + locationScore * 0.2 + leadTimeScore * 0.1
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PINECONE_API_KEY` | Pinecone API key | Required |
| `PINECONE_INDEX_NAME` | Index name | `products-50k` |
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `FIREBASE_PROJECT_ID` | Firebase project | `kasbah-dbab4` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `MAX_PRODUCTS_BATCH` | Batch size | `10` |
| `EMBEDDING_MODEL` | OpenAI model | `text-embedding-3-small` |
| `EMBEDDING_DIMENSION` | Vector dimensions | `512` |

### Filters

The system supports various filters:

- **Category**: Exact match on product category
- **Minimum Quantity**: Products with sufficient stock
- **Maximum Lead Time**: Products within delivery window
- **Location**: Geohash-based location filtering

## 📊 Monitoring

```bash
# View system stats
npm run monitor
```

Displays:
- Pinecone vector count and health
- Cache hit rates and performance
- Memory usage and uptime

## 🔄 Data Sync

### Initial Sync
```bash
npm run sync
```

### Incremental Updates
The system can handle incremental updates by:
1. Detecting new/updated products in Firebase
2. Generating embeddings only for changed items
3. Upserting vectors to Pinecone

## 🎛️ Performance Tuning

### Cache Optimization
- **L1 Cache**: 1000 embeddings in memory
- **L2 Cache**: 30-day TTL in Redis
- **Hit Rate Target**: >70% for production

### Batch Sizes
- **Sync**: 100 products per batch
- **Query**: 10-20 products per request
- **Rate Limiting**: 100ms between batches

### Vector Dimensions
- **512 dimensions**: Good balance of accuracy/performance
- **1536 dimensions**: Higher accuracy, slower queries
- **256 dimensions**: Faster queries, lower accuracy

## 🚨 Troubleshooting

### Common Issues

**Sync fails with "Index not found"**
```bash
npm run setup-pinecone
```

**High latency (>5 seconds)**
- Check Redis connection
- Verify cache hit rates
- Consider reducing embedding dimensions

**Low match quality**
- Review product descriptions
- Check category mappings
- Tune scoring weights

**Memory issues during sync**
- Reduce `BATCH_SIZE` in sync script
- Increase Node.js memory: `node --max-old-space-size=4096`

### Logs

The system provides detailed logging:
- ✅ Success operations
- ⚠️ Warnings for missing data
- ❌ Errors with stack traces
- 📊 Performance metrics

## 💰 Cost Estimation

### Monthly Costs (50K products)
- **Pinecone**: $0 (free tier up to 100K vectors)
- **Redis**: $0 (Redis Labs 30MB free)
- **OpenAI Embeddings**: ~$25 (one-time for initial sync)
- **Firebase**: ~$10 (existing usage)
- **Total**: ~$35/month after initial setup

### Scaling Costs
- **100K products**: ~$70/month
- **500K products**: ~$200/month
- **1M+ products**: Consider dedicated infrastructure

## 🔐 Security

- Firebase credentials via service account
- API keys in environment variables only
- No sensitive data in logs
- Rate limiting on endpoints

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Submit pull request

## 📚 Additional Resources

- [Pinecone Documentation](https://docs.pinecone.io)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Redis Node.js Guide](https://redis.io/docs/clients/nodejs/)

---

## Next Steps 🎯

1. **Get API Keys**: Sign up for Pinecone and OpenAI
2. **Run Setup**: `npm run setup-pinecone`
3. **Sync Data**: `npm run sync`
4. **Test System**: `npm test`
5. **Deploy**: Consider Cloud Functions or Cloud Run

Ready to match 50K products in under 3 seconds! 🚀