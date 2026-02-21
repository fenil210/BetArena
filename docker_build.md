# 1. Login to ECR
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 733153951509.dkr.ecr.ap-south-1.amazonaws.com

# 2. Build the image (from the backend folder)
cd d:\FOOTBALL\backend
docker build -t betarena-backend .

# 3. Tag it for ECR
docker tag betarena-backend:latest 733153951509.dkr.ecr.ap-south-1.amazonaws.com/betarena-backend:latest

# 4. Push to ECR
docker push 733153951509.dkr.ecr.ap-south-1.amazonaws.com/betarena-backend:latest
