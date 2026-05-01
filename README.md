# GoCandidIt
**Intentional Resumes. Authentic Results.**

GoCandidIt is an AI-powered resume tailoring application built with Electron and Node.js. It allows users to maintain a vault of their professional experience and use the Gemini API to instantly generate ATS-optimized resumes targeted at specific job descriptions.

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

> [!NOTE] Data Persistence
> GoCandidIt treats the Desktop and Browser environments independently:
> * **Desktop App**: Data is saved to your system's local application data folder. 
> * **Browser Version**: Data is saved to a `database.db` file within the project directory.

Please note that accounts and "Vault" data do not sync between these two versions; they maintain separate local databases.

---

#### AI Usage Documentation
Branding and project architecture brainstormed in collaboration with Gemini.
Gemini to format README.
Gemini to use Nodemon to automatically restart backend server when saving a file in development.
CanvaAI to generate logo and favicon.
Gemini to help with database creation.
Gemini help with authorization function in server.js and passing it in with the routes
Gemini help with clearing old sessions after connecting to database
Gemini to help speed up logging in and registration for single page application
Gemini to help with sidebar navigation
Gemini help with auto filling personal information from database.
Gemini help with building list of cards from vault
Gemini to help with marking end dates to present.
Gemini help to speed up and write delete route and implementation.
Gemini help with endpoint to generate resume.
Gemini to write code to display resume as a printed copy and print option.
ChatGPT to help align logout button to the bottom of sidebar.
Gemnini help with creating the ElectronJS app and logistics and preferences.
Claude to trouble shoot issue with API key not working in electronJS app.
Gemini to help with logic to encrypt & decrypt user's API key.