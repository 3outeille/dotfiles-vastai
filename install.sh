# ========== ZSH ==========
sudo apt install zsh
# install oh-my-zsh
sh -c "$(wget https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh -O -)"

# Link zsh
rm $HOME/.zshrc
ln -s $HOME/dotfiles-vastai/config/zshrc $HOME/.zshrc

rm -rf $HOME/.zsh
mkdir -p $HOME/.zsh
ln -s $HOME/dotfiles/config/aliases.zsh $HOME/.zsh/aliases.zsh

# Change shell to zsh
chsh -s $(which zsh)

# ======= Pdbpp =========
rm $HOME/.pdbrc.py
rm $HOME/.pdbrc

ln -s $HOME/dotfiles/config/pdbrc.py $HOME/.pdbrc.py
ln -s $HOME/dotfiles/config/pdbrc $HOME/.pdbrc


# ====== Fuzzer Finder =====
git clone --depth 1 https://github.com/junegunn/fzf.git ~/.fzf
~/.fzf/install


# ======= Pyenv =======
curl https://pyenv.run | bash
