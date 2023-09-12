# ========== ssh ==========

ssh-keygen -t ed25519 -C "ferdinand.mom@epita.fr"
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

git config --global user.email "ferdinand.mom@epita.fr"
git config --global user.name "Ferdinand Mom"

# ========== ZSH ==========
sudo apt install zsh
# install oh-my-zsh
sh -c "$(wget https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh -O -)"
