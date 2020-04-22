#!/bin/sh

echo "Make sure you added necessary files to git. Type \"yes\" to continue:"
read -r confirmation
if [ "$confirmation" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

echo "Enter the release tag:"
read -r tag
while [ -z "$tag" ]; do
  echo "tag cannot be empty, try again:"
  read -r tag
done

echo "Enter the release info:"
read -r msg
while [ -z "$msg" ]; do
  echo "Info cannot be empty, try again:"
  read -r msg
done

echo "Commit your work? (yes/[no])"
read -r confirmation
if [ "$confirmation" = "yes" ]; then
  echo "Enter your commit message:"
  read -r commitMsg
  while [ -z "$commitMsg" ]; do
    echo "Commit message cannot be empty. Try again:"
    read -r commitMsg
  done
  git commit -m "$commitMsg"

  echo "Push your commit? (yes/[no])"
  read -r confirmation
  if [ "$confirmation" = "yes" ]; then
    git push
  fi
fi

git tag -a "$tag" -m "$msg"
echo "Push your tag? (yes/[no])"
read -r confirmation
if [ "$confirmation" = "yes" ]; then
  git push origin "$tag"
fi

mkdir -p ./releases
tar -czf ./releases/roombot-"$tag".tar.gz ./database/ddl/*.sql ./*.js ./*.json ./setup.sh README.md
echo "Your release is packed! Please find it in the \"releases\" directory. Your release name is \"roombot-$tag\"."
echo "Done!"
