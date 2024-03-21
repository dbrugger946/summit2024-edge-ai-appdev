# Delete Camel K process
oc delete it example

# Delete TensorFlow server and Minio
oc get all -o name | grep 'minio\|tf-server' | xargs oc delete

# Delete Minio's secret
oc delete secret minio-secret

# Delete Minio's PVC
oc delete pvc minio-pvc
