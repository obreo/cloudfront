# AWS CLOUDFRONT
![CloudFront](./cloudfront.webp)
## Table of Contents
- [Overview](#overview)
- [Scenarios](#scenarios)
  - [Scenario 1: For Simple TLS Certification and Content Delivery Network](#scenario-1-for-simple-tls-certification-and-content-delivery-network)
  - [Scenario 2: Proxy Server and Access Control](#scenario-2-proxy-server-and-access-control)
  - [Scenario 3: Firewall Restriction](#scenario-3-firewall-restriction)
  - [Scenario 4: Caching](#scenario-4-caching)
  - [Scenario 5: Region restriction](#scenario-5-region-restriction)
  - [Scenario 6: Custom Request / Response Control](#scenario-6-custom-request--response-control)
- [Restricted Viewer Access - Signed URLs & Signed Cookies](#restricted-viewer-access---signed-urls--signed-cookies)
  - [Preparation](#preparation)
  - [Generating SSL key](#generating-ssl-key)
  - [Setting Up CloudFront](#setting-up-cloudfront)
  - [Signed Cookies configuration](#signed-cookies-configuration)
- [Application Side](#application-side)
  - [Signed URLs](#signed-urls)
  - [Signed Cookies](#signed-cookies)
- [Code Explanation](#code-explanation)
- [HOW TO](#how-to)
- [Notes](#notes)

# Overview

AWS Cloudfront is a content delivery service (CDN) that is used to deliver content in fast transfering edge locations that are located at different regions. Whenever a request is related to a content assigned with cloudfront, the content will be delivered from the closest edge location to the requestee.

AWS cloudfront can be used as a proxy server; by mask the origin endpoint delivering to the content - like AWS S3. It can be used as an SSL/TLS certificate assigner and terminator with a custom domain name. It's also be used to control the request and response to contnet delivery by setting fucntions - scripts - using edge functions like lambda or cloudfront functions. 

It supports WAF for firewall access, and AWS Sheild for DDoS attack protection for the endpoint. Cloudfront also allows restricting access of content to specific audience or people using presigned URLs and Caching rules.

This article will explain how to use AWS cloudfront for such different cases for future reference whenever needed. It will also explain how signed urls and signed cookies are implemented.

# Scenarios

## Scenario 1: For Simple TLS Certification and Content Delivery Network

Cloudfront can integrate with multiple origins:
1. AWS S3 Bucket: Used to access to S3 objects.

By keeping the S3 bucket public access denied and restrict the bucket policy to Cloudfront endpoint, we provide security to the S3 bucket and its contents and let Cloudfront to have complete control over how the content delivery should behave once requested from the viewer, by using request and response rules, caching rules, firewall rules,  and edge functions.

This supports Origin Access Control (OAC) and Origin Access Identity (OAI) features which restricts the public access to the origin unless the request comes from CloudFront, allowing to implement security configurations to the origin.

1. AWS S3 static site: CloudFront uses the AWS S3 static site endpoint. This will let cloudfront use the S3 content for CDN, apply and terminate SSL certificate, and control the caching. It does not support OAC or OAI.

2. Application Load Balancer endpoint.

3. API Gateway.

4. MediaStorage.

5. Website URL - as a general CDN solution.

All these endpoints can be integarated with cloudfront to deliver SSL certificate and allow CDN delivery from edge locations.

## Scenario 2: Proxy Server and Access Control

CloudFront can be used as a proxy server by masking the origin endpoints and control access to them without while keeping the origin access private. This is implemented by two methods:

1. Origin Access Control: It provides access restriction to the origin by making the CloudFront distribution's endpoint the only way of access to the origin publicly, it supports several origin types including S3.
2. Origin Access Identity: The older version of OAC, used specifically for S3 buckets with less control features than OAC. AWS recommends using OAC.

Masking an origin's endpoint is helpful for security purposes, like hiding the origin's endpoint, iin addition to the access control policies with OAC and OAI, and to force caching and other access configurations.

S3 buckets can be set to private while using either access control types. Onced enabled, restrict the bucket policy with the generated policy by CloudFront - that allows cloudfront to get objects conditionlly to the CloudFront distribution's ID.

## Scenario 3: Firewall Restriction

AWS WAF supports AWS services including AWS cloudFront for Firewall restrictions and monitoring. This helps restricting access to and from certain endpoints based on defined rules.

## Scenario 4: Caching

This is the main purpose of CDN services, to provide caching for content at edge locations to deliver the viewer's request at the closest physical location. This allows fast delivery in miliseconds and helps with cost optimization by delivering the cached content instead of reqeusting it from the origin every time that could put extra charges.

Caching can be configured for the HTTP request method type, the caching region type, and can be cleared using invalidation requests.

## Scenario 5: Region restriction

Cloudfront is used for Region restriction based on country.

## Scenario 6: Custome Request / Response Control 

We can configure the behaviour of response to a URL requests with certain defined rules. Such as defining the referer header that is allowed to view content, or defining default object label to limit ugly URLs like index.html

These rules and configurations can be created using CloudFront functions or lambda@edge functions. Both are similar but lambda@edge can be more dynamic and handles different logic processes, while CloudFront is used for straightforward conditions.

# Restricited Viewer Access - Signed URLs & Signed Cookies

Rerstrict viewer access limits viewing CloudFront endpoints to certain people abd envrionments. This is implemented in two ways:

1. Signing an encryption to the CloudFront's endpoint that provides access to a certain amount of time, this is applied to individual objects.
2. Signing an ecnryption using client cookies, that allow access a CloudFront endpoint for a path that allows access to any object included inside it.

Both methods use the same technique; using a private key at the server side(Backend), that verify's the client's request by pairing being paired with the public key generated from the private key and assigned to the cloudfront secret keys. If verified, the client will get the response, else it will give access denied.


## Preperation
## Generating SSL key
1. Generate an SSL private key and public key using openssl tool or other similar tool.

```
// Generate openssl private key
openssl genrsa -out private_key.pem 2048

// Generate public ssl key from the private key
openssl rsa -pubout -in private_key.pem -out public_key.pem
```
The private SSL key will be used on the server-side to authenticate with the Public key. The public key will be stored by CloudFront to be used for authentication.

## Setting Up CloudFront

1. In the Key Management tab in CloudFront's left navigation bar > create a public key from the Public Key section, by adding the generation public SSL key.
2. In the Key Management tab in CloudFront's left navigation bar > select Keys Group > create a new key group that will use the created public key in [1].
3. Select the CloudFront distribution that will restrict the view access > enable restrict access by scrolling to the behaviour section > select the trusted key group created.

### Signed Cookies configuration

In the Cache Key and origin requests section, use the following options:
* Legacy cache settings
  * Headers: Including the following headers:
    * Access-Control-Request-Method
    * Access-Control-Request-Headers
  * Query Strtings: All
  * Cookies: All

Note: Make sure that CloudFront has access to s3 whether with the general bucket policy or OAC CloudFront policy.

## Application Side

## Signed URLs

Using the CloudFront Signer library, use the CloudFront Signer function and include the Endpoint - including the object key path requested - Private Key, Public Key ID provided by CloudFront, and the expiry date (in seconds).

This will return an encrypted URL that can be viewed by the client till the expiry date.

## Signed Cookies

The signed cookies use a CloudFront signed cookie policy that is either [custom or canned](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-cookies.html). Either of these policies are appended in the script that will generate the signed cookies.

The cookie policy allows defining rules of which domain at what path level to access, and other rules as well.

Using the CloudFront Signer library, use the CloudFront cookies function then include the domain URL - either the CloudFront domain or alternative domain - Private Key, Public Key ID provided by CloudFront, and the expiry date.

The function will return cookie headers- values that will be used to access the endpoint required within the provided domain in the CloudFront signed cookie policy. The provided values then can be set in the browser session or application's request to the requested endpoint, e.g. image.png

Tip: The values can be tested using curl or by directly adding the cookie values in browser from development tools > application > cookies of the related website.

# Code Explanation

The code in the repository allows you to test CloudFront signed URLs and signed Cookies.

## HOW TO

To use the code:
1. Clone the repository
2. using `ssl_cert_generator.sh` or alternative tool, generate an SSL certificate.
3. Add the private key and public key ID (set by CloudFront) in the .env file.
4. Run:
```
npm i
npm start
```

The script runs a number of cases using two functions:
* cloudfront_signed_urls
* cloudfront_signed_cookies

# Notes:

* Make sure to include the path pattern currectly - in case not set to (*)
* If multi origin set, then each should have the same default object name - index.html or else.
* The first and default behaviour created will always have default(*) pattern path, custom ones can have custom paths and can be moved up or down for priority.
* No two behaviours can have the same path pattern, each should identify the sort of file required or directory.
* Setting two different default object names using two different origins will create a conflict, use a seperate distribution for each default object file - index.html, document.pdf, etc...
