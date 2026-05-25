# GoCandidIt
**Intentional Resumes. Authentic Results.**

GoCandidIt is an AI-powered resume tailoring application built with Electron and Node.js. It allows users to maintain a vault of their professional experience and use the Gemini API to instantly generate ATS-optimized resumes targeted at specific job descriptions.

## The Name: GoCandidIt
The name **GoCandidIt** is a dual-layered play on words designed for a professional context:
* **"Go Candid"**: Encourages the user to be authentic and honest about their unique technical achievements rather than using generic templates.
* **"Candidate"**: Since the tool is built for job seekers, the name is a direct nod to the user's role as a "Candidate" in the hiring process.
* **Action-Oriented**: Represents the process of a candidate taking initiative in their career.

## Features
  - **The Vault**: Store and manage your work experience, education history, and technical projects in a local SQLite database.
  - **AI Tailoring**: Leverages the Gemini API to parse you experience and generate high-impact, professional resumes based on your desired job's description.
  - **Resume Management**: Preview, edit, and save versions of your tailored resumes.
  - **Print to PDF**: Built-in preview mode allows you to review and print your resumes directly to PDF.

## Tech Stack
  - **Frontend**: HTML5, Bootstrap 5, Quill.js, and SweetAlert2.
  - **Backend**: Node.js, Express, SQLite3.
  - **Desktop Wrapper**: ElectronJS.
  - **AI**: Google Generative AI (Gemini SDK)

## Installation & Setup
  1. **Clone the repository**:
```shell
git clone https://github.com/drew-1618/gocandidit.git
cd gocandidit
```
  2. **Install dependencies**:
```shell
npm install
```
  3. **Environment Variables**: Create a `.env` file in the root directory and add your keys:
```txt
PORT=8000
GEMINI_API_KEY=your_gemini_api_key_here
ENCRYPTION_KEY=your_32_character_encryption_key
```
  4. **Run the application**:
    - **Development (Server only): `npm run dev`
    - **Desktop App: `npm start`

## Getting Started
Once the application is running, you will need to create a local account to start building your resume vault:

> [!NOTE]
> You can have several independent users on the same local system

  1. **Launch the App**: Run `npm start` to open the GoCandidIt desktop app.
  2. **Register**: Click on **"Need an account? Register"** at the bottom of the login screen.
  3. **Credentials**: Enter an email address and create a password you will remember.
  4. **Access the Vault**: Once registered, you will be automatically logged in and can begin adding your work experience, education, and projects to your personal vault.

## Desktop Distribution
If you want to install GoCandidIt as a standalone desktop application rather than running it through the terminal or browser, you can build the executable:
  1. **Build the Installer**: `npm run dist` or `npm run dist:run` to automatically run once built.
  2. **Install**: 
    - Navigate to the newly created dist/ folder in your project directory (if running `npm run dist`).
    - Run the GoCandidIt Setup 1.0.0.exe file (on Windows) to install the application to your machine (if running `npm run dist`).
    - The installer allows you to change the installation directory and will create a desktop shortcut named GoCandidIt.
  3. **Post-Installation**:
    - Once installed, the app will run as a native window and does not require you to keep a terminal window open.

> [!NOTE] 
> GoCandidIt treats the Desktop and Browser environments independently:
> * **Desktop App**: Data is saved to your system's local application data folder. 
> * **Browser Version**: Data is saved to a `database.db` file within the project directory.

Please note that accounts and "Vault" data do not sync between these two versions; they maintain separate local databases.
