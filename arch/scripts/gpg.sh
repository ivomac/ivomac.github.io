## GPG KEY

echo "Setting up GPG key"

mkdir -p "$GNUPGHOME"

chmod 700 "$GNUPGHOME"

git clone "$REPO/GPG.git" ~/GPG

cp ~/GPG/gpg-agent.conf "$GNUPGHOME/"

gpg --import GPG/pass.key
gpg --edit-key "Ivo Aguiar Maceira" trust quit
rm -rf ~/GPG

