const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const connectDB = async () => {
  try {
    // Test the connection by making a simple query
    const { data, error } = await supabase.from('users').select('count').single();
    
    if (error) {
      console.error('Database connection failed:', error.message);
      process.exit(1);
    }
    
    console.log('Supabase connected successfully');
    
    // Ensure storage buckets exist
    await ensureStorageBuckets();
    
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const ensureStorageBuckets = async () => {
  try {
    console.log('Checking storage buckets...');
    // Check if 'apps' bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    console.log('Storage buckets response:', { buckets, error: listError });
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }
    
    if (!buckets || buckets.length === 0) {
      console.log('No buckets found - this indicates a configuration issue');
      console.log('Supabase URL:', process.env.SUPABASE_URL);
      console.log('Service Role Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
      return;
    }
    
    const appsBucketExists = buckets.some(bucket => bucket.name === 'apps');
    
    if (!appsBucketExists) {
      console.log('Creating apps storage bucket...');
      const { error: createError } = await supabase.storage.createBucket('apps', {
        public: true,
        allowedMimeTypes: ['application/vnd.android.package-archive', 'application/octet-stream'],
        fileSizeLimit: 104857600 // 100MB
      });
      
      if (createError) {
        console.error('Error creating apps bucket:', createError);
      } else {
        console.log('Apps storage bucket created successfully');
      }
    }
    
    // Check for other required buckets
    const requiredBuckets = ['app_icons', 'app_screenshots', 'avatars'];
    
    for (const bucketName of requiredBuckets) {
      const bucketExists = buckets.some(bucket => bucket.name === bucketName);
      
      if (!bucketExists) {
        console.log(`Creating ${bucketName} storage bucket...`);
        let bucketConfig = {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          fileSizeLimit: 10485760 // 10MB
        };
        
        // Special configuration for avatars bucket
        if (bucketName === 'avatars') {
          bucketConfig.fileSizeLimit = 5242880; // 5MB for avatars
        }
        
        const { error: createError } = await supabase.storage.createBucket(bucketName, bucketConfig);
        
        if (createError) {
          console.error(`Error creating ${bucketName} bucket:`, createError);
        } else {
          console.log(`${bucketName} storage bucket created successfully`);
        }
      }
    }
  } catch (error) {
    console.error('Error ensuring storage buckets:', error);
  }
};

module.exports = { supabase, connectDB };
