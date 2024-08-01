require("dotenv").config();

if (!process.env.INFERABLE_API_SECRET) {
  console.error("Missing INFERABLE_API_SECRET in .env");
  process.exit(1);
}

if (!process.env.INFERABLE_CLUSTER_ID) {
  console.error("Missing INFERABLE_CLUSTER_ID in .env");
  process.exit(1);
}

const demoCluster = process.env.INFERABLE_API_SECRET.includes("sk_demo");

if (demoCluster) {
  console.log(
    `http://app.inferable.ai/demo/${process.env.INFERABLE_CLUSTER_ID}/workflows/new?token=${process.env.INFERABLE_API_SECRET}`
  );
} else {
  console.log(
    `http://app.inferable.ai/clusters/${process.env.INFERABLE_CLUSTER_ID}/workflows`
  );
}
