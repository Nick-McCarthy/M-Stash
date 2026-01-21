The application requires an aws account and a properly configure s3 bucket to function. Create a public s3 bucket and assign the below bucket policy (replacing the placeholder name with your bucket name).
Then implement the CORS policy to enable video streaming (you may wish to change AllowedOrigins, "\*" is used here because it is an example.
If you are using an access key and not IAM roles then the ENV variables listed below are required (to create an access key click on your account name in the top right hand corner, and then click on security credentials).

//---------------------AWS S3 Bucket Policy-----------------------------------(strongly recommended for public buckets, replace place holder with your bucket name)

{
"Version": "2012-10-17",
"Statement": [
{
"Sid": "PublicReadGetObject",
"Effect": "Allow",
"Principal": "*",
"Action": "s3:GetObject",
"Resource": "arn:aws:s3:::YOUR-BUCKET-NAME-GOES-HERE/*"
}
]
}

//--------------------AWS CORS Rules--------- (required for HLS streaming)
[
{
"AllowedHeaders": [
"*"
],
"AllowedMethods": [
"GET",
"HEAD"
],
"AllowedOrigins": [
"*"
],
"ExposeHeaders": [
"Content-Length",
"Content-Type",
"Content-Range",
"Accept-Ranges",
"ETag",
"Last-Modified"
],
"MaxAgeSeconds": 3000
}
]

//------------------------environment variables-------------------------(env vars)
NEXTAUTH_SECRET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET_NAME=
AWS_REGION=
DB_SSL= False
