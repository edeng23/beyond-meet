# Beyond Meet

Visualize your social connection graph.

## Prerequisites

Before you begin, ensure you have met the following requirements:
- You have a **Google Cloud Platform** account.
- You have installed **[Git](https://git-scm.com/downloads)** and **[Make](https://www.gnu.org/software/make/)** on your machine.

## Setup

### Setting Up Your Google Cloud Project and Activating the Gmail API

1. **Navigate to the Google Developers Console**: Open your web browser and go to the [Google Developers Console](https://console.developers.google.com/). This will be your starting point for creating a new project.

2. **Create a New Project**: Click on the "Create Project" button. You'll be prompted to enter a project name and select a billing account. Fill in the required details to proceed.

3. **Enable the Gmail API**: After your project is created, navigate to the "Library" section within the console. Use the search bar to find the "Gmail API". Click on it and then click the "Enable" button to activate the API for your project.

4. **Configure OAuth Consent Screen**: Go to the "OAuth consent screen" tab in the "Credentials" section. Fill in the required fields such as the application name, user support email, and developer contact information. Save and continue.

5. **Create OAuth 2.0 Credentials**: In the "Credentials" tab, click on "Create Credentials" and select "OAuth 2.0 Client IDs". Follow the on-screen instructions to configure the OAuth consent screen and create your credentials.

6. **Download the Configuration File**: After creating your OAuth 2.0 Client ID, you'll see an option to download your credentials as a JSON file. Download this file and save it in the root directory of your project. This file contains important client configuration details.

## Running the Project

To run this project, open your terminal and navigate to the project directory. Then, execute the following command:

```bash
make all