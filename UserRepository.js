const { Client } = require('@elastic/elasticsearch');



class UserRepository
{

  async  setRoles() {
    // Create a new Elasticsearch client instance
    const client = new Client({ node: 'http://localhost:9200' });
    try {

      // Define the role settings
      const adminRoleSettings = {
        cluster: ['all'],
        indices: [
          {
            names: '*',
            privileges: ['*']
          }
        ],
        run_as: []
      };
  
      // Create or update the role
      const response = await client.security.putRole({
        name: 'admin',
        body: adminRoleSettings
      });

      const userRoleSettings = {
        cluster: ['monitor'],
        indices: [
          {
            names: '*',
            privileges: ['read']
          }
        ],
        run_as: []
      };
  
      // Create or update the role
      const response2 = await client.security.putRole({
        name: 'user',
        body: userRoleSettings
      });




  
      console.log('Role created/updated successfully:', response);
      console.log('Role created/updated successfully:', response2);
    } catch (error) {
      console.error('Error creating/updating role:', error);
    } finally {
      // Close the Elasticsearch client
      client.close();
    }
  }



  async createAdmin(username,password)
    {
          // Create a new Elasticsearch client instance
    const client = new Client({ node: 'http://localhost:9200' });
  try {
    // Define the user details
    const username = username;
    const password = password;
    const roles = ['admin_test'];


    // Create the user
    const response = await client.security.putUser({
      username,
      body: {
        password,
        roles
      }
    });

    console.log('Admin created successfully:', response);
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    // Close the Elasticsearch client
    client.close();
  }
    }

  async createUser(username, password) {
  try {
        // Create a new Elasticsearch client instance
        const client = new Client({ node: 'http://localhost:9200' });
    // Define the user details
    const username = username;
    const password = password;
    const roles = ['user_test'];


    // Create the user
    const response = await client.security.putUser({
      username,
      body: {
        password,
        roles
      }
    });

    console.log('User created successfully:', response);
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    // Close the Elasticsearch client
    client.close();
  }
    }
}


module.exports = UserRepository;