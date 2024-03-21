# set -x

# TensorFlow Server
server=http://localhost:8080/price

# image=../../workbench/samples/bali-tea.jpeg
image=../../workbench/samples/banana.jpeg

curl -v \
-H "content-type: application/json" \
$server \
-d '
{
   "instances":
   [
	{
	   "b64": "'$(base64 -i $image)'"
	}
   ]
}' | jq
