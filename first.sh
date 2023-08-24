# ========== ssh ==========

ssh-keygen -t ed25519 -C "ferdinand.mom@epita.fr"
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# ========== ZSH ==========
sudo apt install zsh
# install oh-my-zsh
sh -c "$(wget https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh -O -)"
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions

# Link zsh
rm $HOME/.zshrc
ln -s $HOME/dotfiles-vastai/config/zshrc $HOME/.zshrc

rm -rf $HOME/.zsh
mkdir -p $HOME/.zsh
ln -s $HOME/dotfiles-vastai/config/aliases.zsh $HOME/.zsh/aliases.zsh

# Change shell to zsh
chsh -s $(which zsh)
