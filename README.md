# NodeJS Backend Project

This repository contains the backend code for a NodeJS project. Below are the steps to initialize a new Git repository and push the code to GitHub.

## Initial Setup

````bash
# Initialize a new Git repository
git init

# Add all files to the staging area
git add .

# Commit the changes to the main branch
git commit -m "Initialize project with basic backend setup"

# Create and switch to the 'main' branch
git branch -M main

``` Connect to GitHub ```

# Add the remote repository (GitHub)
git remote add origin https://github.com/kumaraswini-11/node-backend.git

# Push the changes to the 'main' branch on the remote repository
git push -u origin main


## Configure Git Identity
# Set your account's default identity (Global)
git config --global user.email "you@example.com"
git config --global user.name "Your Name"

# Set your account's default identity (Local for this Project)
git config user.email "you@example.com"
git config user.name "Your Name"

- Omit --global when setting identity for this repository only.

````

- For further information, refer to the [Model Link](https://app.eraser.io/workspace/YtPqZ1VogxGy1jzIDkzj?origin=share)
- Further queries and documentation will be added soon.

db - raw refresh token
user cookie - encrypted refresh token

every time a user ressue a access token we are also generating a new refresh token for that user.
code . - open vs code

youtube backend

In ower IT filled you should learn any language in two different ways one four your understanding and second four interview :) believe yourself and just practice 15-20 day for interview only..🧑‍💻 you can do it

"feat" is short for "feature" and is commonly used as a keyword in Git commit messages to indicate the addition or implementation of a new feature.

useEffect(() => {
// logic here

return () => {
// clean up
};
}, []); // no dependencies!
=======================

# Copy custom Nginx configuration including SSL files

COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx/ssl/server.crt /etc/nginx/ssl/
COPY nginx/ssl/server.key /etc/nginx/ssl/
