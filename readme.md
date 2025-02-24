# Beyond Meet

Visualize your social connection graph.

## Prerequisites

Before you begin, ensure you have met the following requirements:
- You have a **Google Cloud Platform** account.
- You have installed **[Docker](https://www.docker.com/products/docker-desktop)**, **[Python](https://www.python.org/downloads/)** and **[Make](https://www.gnu.org/software/make/)** on your machine.

## Setup

### Setting Up Your Google Cloud Project and Activating the Gmail API

1. **Navigate to the Google Developers Console**: Open your web browser and go to the [Google Developers Console](https://console.developers.google.com/). This will be your starting point for creating a new project.

2. **Create a New Project**: Click on the "Create Project" button. You'll be prompted to enter a project name and select a billing account. Fill in the required details to proceed.

3. **Enable the Gmail API**: After your project is created, navigate to the "Library" section within the console. Use the search bar to find the "Gmail API". Click on it and then click the "Enable" button to activate the API for your project.

4. **Configure OAuth Consent Screen**: Go to the "OAuth consent screen" tab in the "Credentials" section. Fill in the required fields such as the application name, user support email, and developer contact information. Save and continue.

5. **Create OAuth 2.0 Credentials**: In the "Credentials" tab, click on "Create Credentials" and select "OAuth 2.0 Client IDs". Follow the on-screen instructions to configure the OAuth consent screen and create your credentials.

6. **Download the Configuration File**: After creating your OAuth 2.0 Client ID, you'll see an option to download your credentials as a JSON file. Download this file and save it in the root directory of your project. This file contains important client configuration details.

## Running the Project

1. First, authenticate with Google (this needs to be done only once or when the token expires):
```bash
make auth
```
This will open a browser window for you to authenticate with Google.

2. After authentication is complete, build and run the application:
```bash
make build
make run
```

Or you can do everything in one command:
```bash
make all
```

## Viewing the Network Graph
After the application has finished running, you can connect to the Neo4j server your Neo4j viewer of choice.

Use the following credentials:
```
    URI: bolt://neo4j:7687
    User: neo4j
    Password: Aa123456
```

Use Cypher queries to explore your social connection graph. For example, you can start with a simple query like MATCH (n) RETURN n to view all nodes in the graph.