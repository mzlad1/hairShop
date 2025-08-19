#!/bin/bash

echo "Building React app..."
npm run build

if [ $? -eq 0 ]; then
    echo "Build successful. Deploying to Firebase..."
    firebase deploy --only hosting
    
    if [ $? -eq 0 ]; then
        echo "Deployment successful!"
        echo "Your app is now live at: https://beaty-shop-db.web.app"
    else
        echo "Deployment failed!"
        exit 1
    fi
else
    echo "Build failed!"
    exit 1
fi
