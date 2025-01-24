#!/bin/bash

echo "Generating SSL certificate and key for CloudFront..."
echo "Creating a private key..."
openssl genrsa -out ./data/private_key.pem 2048

echo "Creatng public key..."
openssl rsa -pubout -in ./data/private_key.pem -out ./data/public_key.

echo "SSL certoificate and key generated successfully in the data folder."