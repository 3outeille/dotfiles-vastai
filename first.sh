# ========== ssh ==========

ssh-keygen -t ed25519 -C "ferdinand.mom@epita.fr"
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# ========== ZSH ==========
sudo apt install zsh
# install oh-my-zsh
sh -c "$(wget https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh -O -)"
