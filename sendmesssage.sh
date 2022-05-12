TAG=1
if [[ $# -eq 1 ]]
then
    TAG=$1
fi

aws sns publish\
 --topic-arn "arn:aws:sns:eu-central-1:055951622116:proof-of-concept-sns-lambda-rs-test-topic"\
 --message "{ \"tag\": $1 }"\
 --message-attributes " {\"test\": { \"DataType\": \"String\", \"StringValue\": \"value\" } }"