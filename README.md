# Sending messages from AWS SNS to Lambda function

## Questions

- What happens if lambda function always fails
- What happens if there is not enought concurrency for lambda to be invoked
- What happens if there is a deploy in the middle of processing

## Configuration

Lambda subscribes to SNS test-topic with DLQ configured.

There is a DLQ for lambda configured for SNS topic push-to-dlq because serverless framework does not yet support SQS queue to be configured as Lambda DLQ.
There is a subscription for the SQS lambda-dlq which stores
unprocessed messages.

We are investigating what happens to messages if Lambda throws an error.

## Observations

### Lambda crash

SNS sends message to lambda asynchronously. This means after the message is succesfully sent
to lambda it is considered delivered even if lambda handler fails.
See: [Using AWS Lambda with Amazon SNS](https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html) and [SNS Delivery Reliability](https://aws.amazon.com/sns/faqs/#Reliability).

> **Note**
>
> SNS delivers each message once but it is **not guaranteed**. Therefore lambda functions should be able to process same message twice without errors or side effects.

There are 2 retries performed by lambda runtime. However if all of them fails, the message is lost. See [Error handling and automatic retries in AWS Lambda](https://docs.aws.amazon.com/lambda/latest/dg/invocation-retries.html).
Therefore there should be also dead-letter queue configured on lambda as well.

#### SNS DLQ

If SNS cannot deliver to lambda because there are not access rights or lambda does not exist then
the message is sent to SNS dead-letter queue:

```json
{
  "Type": "Notification",
  "MessageId": "9e787ce4-e818-57ee-b2a1-261256c60367",
  "TopicArn": "arn:aws:sns:eu-central-1:055951622116:proof-of-concept-sns-lambda-rs-test-topic",
  "Message": "{ \"tag\": 4 }",
  "Timestamp": "2022-05-12T07:51:58.805Z",
  "SignatureVersion": "1",
  "Signature": "ASC/K2PqCL7D1sl3MngpqP5h7JTbdiyxgvE6tSMmEVujTSVaVTv9z6pxdAm6aRRAw3J1dLKcZq4pQ7qpwx0pgOidRWHhB8VMiciDFl+VN56mqlZhTI9kTkBmLVmdq9TWyDbxGqmqnrnuEfPMbbBg4fy7dU8r0qdc6KnI+zqMO7wMfNZvilpiyOCG59MPl4HzjDlYf9fMSmoQVKifYaV7bmOECbqk6mD9fMNe03ZW9Mux5wyIPxeQpy+BMGqGbcxAqt2We/sAwKTrcuf8ICxkmhd0kPfAkoSrHzvLX7Qw/fW2ZqKGAHD1l85JY7vWSicYHSjwnr6jGGEfxD5OyworEQ==",
  "SigningCertURL": "https://sns.eu-central-1.amazonaws.com/SimpleNotificationService-7ff5318490ec183fbaddaa2a969abfda.pem",
  "UnsubscribeURL": "https://sns.eu-central-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:eu-central-1:055951622116:proof-of-concept-sns-lambda-rs-test-topic:4c1c5632-43a1-4b65-8a65-27c8ae85ebcf",
  "MessageAttributes": {
    "test": { "Type": "String", "Value": "value" }
  }
}
```

#### Lambda DLQ

If lambda cannot process message because of error if DLQ is configured then a message is sent to DLQ. Currently serverless framework does not support SQS to be
a dead-letter destination so we use a workaround that we configure an SNS topic
which push the message to SQS. The ordiginal message is wrapped in "Message" attribute.

```json
{
  "Type": "Notification",
  "MessageId": "ca35d352-b9ff-5de7-82cb-89a474246c24",
  "TopicArn": "arn:aws:sns:eu-central-1:055951622116:proof-of-concept-sns-lambda-rs-push-to-dlq-topic",
  "Message": "{\"Records\":[{\"EventSource\":\"aws:sns\",\"EventVersion\":\"1.0\",\"EventSubscriptionArn\":\"arn:aws:sns:eu-central-1:055951622116:proof-of-concept-sns-lambda-rs-test-topic:1a718daa-685e-4715-a077-52412d89f5a6\",\"Sns\":{\"Type\":\"Notification\",\"MessageId\":\"8f3efd37-496d-5abb-8127-a7c184748203\",\"TopicArn\":\"arn:aws:sns:eu-central-1:055951622116:proof-of-concept-sns-lambda-rs-test-topic\",\"Subject\":null,\"Message\":\"{ \\\"tag\\\": 1 }\",\"Timestamp\":\"2022-05-12T08:52:41.220Z\",\"SignatureVersion\":\"1\",\"Signature\":\"TmE8RnXGgKCNW4gGhCPmG4VNirWPoxnvIT37clB8/faRfrBknrpw3DS3wWKMw5O9EDNw+OuMwdOFt+4K+DS0/3Q1jFuyLxSqss5WK1LgkNucjGDPBcsNIJ0XIR3onzLWnBna0SvK0cYYXY/EhnXwfBsotSQ/u6k8LH1yRh1tWrJgr8UwhBWA7aJbDk9f4JIJ1B6l3SmUxgiNS/rDeYZTbStpB+SiVQxqkWgzxyl3IzHoXrMyB6XZhtqDFt2deqgyQFZi1JL6Z29BlgluQrdx+ZlEhYj3Gkp5Wq8KuHJkncmfzy0bpn32Zji17G6zumzr9b99yQnXaOanBOWAmbbs+Q==\",\"SigningCertUrl\":\"https://sns.eu-central-1.amazonaws.com/SimpleNotificationService-7ff5318490ec183fbaddaa2a969abfda.pem\",\"UnsubscribeUrl\":\"https://sns.eu-central-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:eu-central-1:055951622116:proof-of-concept-sns-lambda-rs-test-topic:1a718daa-685e-4715-a077-52412d89f5a6\",\"MessageAttributes\":{\"test\":{\"Type\":\"String\",\"Value\":\"value\"}}}}]}",
  "Timestamp": "2022-05-12T08:55:55.113Z",
  "SignatureVersion": "1",
  "Signature": "MFm1x7VEf9OvSkj9tLbdAAvczTNzAZWjotk3BJginOTSrGvyq2S+My2r88GLk2rQnucz/wg3MAYf7rkBg/eW+YXh09JfRZSKZHyAoANBIAauiQ/E5wcOaEVC+6USeKYZP0foIdtgn2A3Lp10ufq7wVzhXFiOh6kXBxoZ5gBxao3i825hECYqikwGPLUvmdbaZhqvvuwyO9+sbnWOuq/paZayRUXvxvlLcKIrAHKZIRqmeRmbRKdQeA2dkW7uIk87ysxW+sE0/vHaAoqkrV5O0Fnx7Nzgsrj6PuXPqJREVBrKncY6R1IDobbL8MTJaYptGLuiSG+HTIm4oHLUH9YGwg==",
  "SigningCertURL": "https://sns.eu-central-1.amazonaws.com/SimpleNotificationService-7ff5318490ec183fbaddaa2a969abfda.pem",
  "UnsubscribeURL": "https://sns.eu-central-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:eu-central-1:055951622116:proof-of-concept-sns-lambda-rs-push-to-dlq-topic:50bc7de2-2f6b-47be-80b3-072ec35e8cf2",
  "MessageAttributes": {
    "RequestID": {
      "Type": "String",
      "Value": "1760f4cd-4296-464a-bc3a-6c6a920eb545"
    },
    "ErrorCode": { "Type": "Number", "Value": "200" },
    "ErrorMessage": { "Type": "String", "Value": "Crash handler" }
  }
}
```

### Not enough concurrency

If there is a concurrency limit then lambda runtime buffers the message until it is ready to process it.

### Deployment while processing message

If there is a deployment while processing message the current lambda finishes execution and then the lambda environment
is reinitialized and any pending messages queued by lambda runtime are then processed with new lambda version.
