-- Existing deployments already have this bucket, so raise its limit separately.
update storage.buckets
set file_size_limit = 1073741824
where id = 'job-consults';
